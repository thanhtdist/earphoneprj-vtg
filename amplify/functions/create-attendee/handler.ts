import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';

/**
 * This function creates a new Chime attendee when a participant joins a meeting to listen to a live audio stream.
 * @param event - Contains Request Meeting ID and External User ID
 * @returns Attendee Response if successful, error message if failed 
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Create a new Chime SDK Meeting instance
  const chime = new AWS.ChimeSDKMeetings({ region: Config.region });

  try {
    // Parse body from API Gateway event
    const meetingId = event.pathParameters ? event.pathParameters.MeetingID : null;
    const { externalUserId } = JSON.parse(event.body || '{}');

    console.log('Creating attendee with meetingId: ', meetingId, 'externalUserId: ', externalUserId);

    // Input validation
    if (!meetingId || !externalUserId) {
      console.error('Invalid input: meetingId and externalUserId are required.', { meetingId, externalUserId });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: meetingId and externalUserId are required.' }),
        headers: Config.headers,
      };
    }

    // Create a new Chime meeting
    const attendeeResponse = await chime.createAttendee({
      MeetingId: meetingId, // Meeting ID 
      ExternalUserId: externalUserId  // Unique ID for each attendee (host or listener)
    }).promise();

    console.log('Created Attendee Response: ', attendeeResponse.Attendee?.AttendeeId);

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: attendeeResponse.Attendee,
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to Create Attendee: ', { error, event });
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
