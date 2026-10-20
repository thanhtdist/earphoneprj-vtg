import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { v4 as uuid } from 'uuid';
import { Config } from '@configs/config';

/**
 * Attach a live meeting to a tour, atomically.
 *
 * Two request shapes on the same route (PUT /tours/{TourID}/meeting):
 *
 *  1. Legacy setter  - body { meetingId, channelId, previousMeetingId? }
 *     Kept for any out-of-band caller. Now a guarded (conditional) write, not a blind overwrite.
 *
 *  2. Get-or-create  - body { expectedMeetingId }
 *     expectedMeetingId === ''    -> the tour should have no meeting yet (first Guide start)
 *     expectedMeetingId === <id>  -> the tour should still point at this now-expired id (rejoin)
 *
 *     Only ONE concurrent caller creates the Chime meeting (+ the channel, when the tour has none yet): it takes a claim lock on
 *     the tour item (meetingCreating / meetingCreatingAt), creates the resources, then commits
 *     them. Every other caller polls the tour row and is handed the winner's meeting to join.
 *     This is what closes the "two Guides start simultaneously" race (Issue 3).
 */

const STALE_LOCK_MS = 20_000;   // a claim older than this is treated as abandoned
const POLL_ATTEMPTS = 20;       // a losing caller waits POLL_ATTEMPTS * POLL_INTERVAL_MS for the winner
const POLL_INTERVAL_MS = 500;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const respond = (statusCode: number, body: Record<string, unknown>) => ({
  statusCode,
  body: JSON.stringify(body),
  headers: Config.headers,
});

// getMeeting resolves for a live meeting; Chime throws NotFoundException once it has expired.
async function isMeetingAlive(chimeMeetings: AWS.ChimeSDKMeetings, meetingId: string): Promise<boolean> {
  try {
    await chimeMeetings.getMeeting({ MeetingId: meetingId }).promise();
    return true;
  } catch (err: any) {
    if (err.code === 'NotFoundException' || err.name === 'NotFoundException' || err.statusCode === 404) {
      return false;
    }
    throw err;
  }
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });
  const chimeMeetings = new AWS.ChimeSDKMeetings({ region: Config.region });
  const chimeIdentity = new AWS.ChimeSDKIdentity({ region: Config.messageRegion });
  const chimeMessaging = new AWS.ChimeSDKMessaging({ region: Config.messageRegion });

  const TABLE = Config.dbTables.TOURS;

  try {
    const tourId = event.pathParameters ? event.pathParameters.TourID : null;
    const body = JSON.parse(event.body || '{}');
    const {
      meetingId,
      channelId,
      previousMeetingId = '',
      expectedMeetingId = '',
    } = body;

    console.log('update-meeting-by-tourid:', { tourId, meetingId, channelId, previousMeetingId, expectedMeetingId });

    if (!tourId) {
      return respond(400, { error: 'Invalid input: tourId is required.' });
    }

    // ---------- 1. Legacy setter branch ----------
    if (meetingId && channelId) {
      try {
        await dynamoDB.update({
          TableName: TABLE,
          Key: { tourId },
          UpdateExpression:
            'set meetingId = :meetingId, channelId = :channelId remove meetingCreating, meetingCreatingAt',
          ConditionExpression:
            'attribute_not_exists(meetingId) OR meetingId = :previousMeetingId OR meetingId = :meetingId',
          ExpressionAttributeValues: {
            ':meetingId': meetingId,
            ':channelId': channelId,
            ':previousMeetingId': previousMeetingId,
          },
        }).promise();
      } catch (err: any) {
        if (err.code === 'ConditionalCheckFailedException') {
          const current = await dynamoDB.get({
            TableName: TABLE,
            Key: { tourId },
            ProjectionExpression: 'meetingId, channelId',
          }).promise();
          return respond(409, {
            error: 'Tour meeting already set by another device',
            data: {
              meetingId: current.Item?.meetingId ?? null,
              channelId: current.Item?.channelId ?? null,
            },
          });
        }
        throw err;
      }
      return respond(200, {
        message: 'Tour updated successfully',
        data: { tourId, meetingId, channelId },
      });
    }

    // ---------- 2. Get-or-create branch ----------
    const tourRes = await dynamoDB.get({ TableName: TABLE, Key: { tourId } }).promise();
    if (!tourRes.Item) {
      return respond(404, { error: 'Tour not found.' });
    }

    // What the caller believes the tour currently points at.
    let expected: string = expectedMeetingId || '';

    // If the tour already names a meeting, is it still alive in Chime?
    const currentMeetingId: string | undefined = tourRes.Item.meetingId;
    if (currentMeetingId) {
      if (await isMeetingAlive(chimeMeetings, currentMeetingId)) {
        return respond(200, {
          message: 'Tour meeting already live',
          data: {
            meetingId: currentMeetingId,
            channelId: tourRes.Item.channelId ?? null,
            created: false,
          },
        });
      }
      // Expired: we may replace it, but only if nobody has moved it since.
      expected = currentMeetingId;
    }

    // ---------- 2a. Claim the lock ----------
    const reqId = uuid();
    const now = Date.now();
    try {
      await dynamoDB.update({
        TableName: TABLE,
        Key: { tourId },
        UpdateExpression: 'set meetingCreating = :reqId, meetingCreatingAt = :now',
        ConditionExpression:
          '(attribute_not_exists(meetingId) OR meetingId = :expected) AND ' +
          '(attribute_not_exists(meetingCreating) OR meetingCreatingAt < :staleCutoff)',
        ExpressionAttributeValues: {
          ':reqId': reqId,
          ':now': now,
          ':expected': expected,
          ':staleCutoff': now - STALE_LOCK_MS,
        },
      }).promise();
    } catch (err: any) {
      if (err.code !== 'ConditionalCheckFailedException') throw err;

      // Lost the claim: another caller is creating (or just created) the meeting. Wait for it.
      for (let i = 0; i < POLL_ATTEMPTS; i++) {
        await sleep(POLL_INTERVAL_MS);
        const poll = await dynamoDB.get({
          TableName: TABLE,
          Key: { tourId },
          ProjectionExpression: 'meetingId, channelId',
        }).promise();
        const winnerMeetingId: string | undefined = poll.Item?.meetingId;
        if (winnerMeetingId && winnerMeetingId !== expected) {
          return respond(200, {
            message: 'Joined the meeting created by another device',
            data: {
              meetingId: winnerMeetingId,
              channelId: poll.Item?.channelId ?? null,
              created: false,
            },
          });
        }
      }
      return respond(409, { error: 'Timed out waiting for another device to create the meeting.' });
    }

    // ---------- 2b. Won the claim: create Chime resources, then commit ----------
    try {
      const meetingResp = await chimeMeetings.createMeeting({
        ClientRequestToken: uuid(),
        ExternalMeetingId: uuid(),
        MediaRegion: Config.region,
        MeetingFeatures: {
          Audio: { EchoReduction: 'AVAILABLE' },
          Video: { MaxResolution: 'None' },
          Content: { MaxResolution: 'None' },
        },
      }).promise();
      const newMeetingId = meetingResp.Meeting?.MeetingId;
      if (!newMeetingId) throw new Error('Chime createMeeting returned no MeetingId');

      // The channel belongs to the tour, not to the meeting: an expired meeting is replaced, its
      // channel is kept so the chat history survives the rejoin (as #93 did on the client).
      // Only the first start of the tour creates one
      let newChannelId: string | undefined = tourRes.Item.channelId;
      if (!newChannelId) {
        const userResp = await chimeIdentity.createAppInstanceUser({
          AppInstanceArn: Config.appInstanceArn,
          AppInstanceUserId: uuid(),
          ClientRequestToken: uuid(),
          Name: 'Guide',
          ExpirationSettings: {
            ExpirationCriterion: 'CREATED_TIMESTAMP',
            ExpirationDays: Config.appInstanceUserExpirationDays,
          },
        }).promise();
        const ownerArn = userResp.AppInstanceUserArn;
        if (!ownerArn) throw new Error('Chime createAppInstanceUser returned no ARN');

        const channelResp = await chimeMessaging.createChannel({
          AppInstanceArn: Config.appInstanceArn,
          Name: 'LiveSession',
          Mode: 'UNRESTRICTED',
          Privacy: 'PUBLIC',
          ClientRequestToken: uuid(),
          ChimeBearer: ownerArn,
          ExpirationSettings: {
            ExpirationCriterion: 'LAST_MESSAGE_TIMESTAMP',
            ExpirationDays: Config.channelExpirationDays,
          },
        }).promise();
        const newChannelArn = channelResp.ChannelArn;
        if (!newChannelArn) throw new Error('Chime createChannel returned no ChannelArn');
        newChannelId = newChannelArn.split('/').pop();
      }

      // Commit - only if we still hold the lock we took above.
      try {
        await dynamoDB.update({
          TableName: TABLE,
          Key: { tourId },
          UpdateExpression:
            'set meetingId = :m, channelId = :c remove meetingCreating, meetingCreatingAt',
          ConditionExpression: 'meetingCreating = :reqId',
          ExpressionAttributeValues: { ':m': newMeetingId, ':c': newChannelId, ':reqId': reqId },
        }).promise();
      } catch (err: any) {
        if (err.code !== 'ConditionalCheckFailedException') throw err;
        // Our lock was stolen on the stale-timeout and another caller committed first. Hand back
        // their result; the meeting we just made is a harmless orphan (auto-expires when empty).
        const current = await dynamoDB.get({
          TableName: TABLE,
          Key: { tourId },
          ProjectionExpression: 'meetingId, channelId',
        }).promise();
        return respond(200, {
          message: 'Another device committed first; joining its meeting',
          data: {
            meetingId: current.Item?.meetingId ?? null,
            channelId: current.Item?.channelId ?? null,
            created: false,
          },
        });
      }

      return respond(200, {
        message: 'Tour meeting created',
        data: { meetingId: newMeetingId, channelId: newChannelId, created: true },
      });
    } catch (err) {
      // Creation failed after we took the lock - release it so the next caller can retry at once.
      await dynamoDB.update({
        TableName: TABLE,
        Key: { tourId },
        UpdateExpression: 'remove meetingCreating, meetingCreatingAt',
        ConditionExpression: 'meetingCreating = :reqId',
        ExpressionAttributeValues: { ':reqId': reqId },
      }).promise().catch(() => { /* best effort */ });
      throw err;
    }
  } catch (error: any) {
    console.error('Failed to update tour meeting: ', { error, event });
    return respond(error?.statusCode || 500, { error: error.message || 'Internal Server Error' });
  }
};
