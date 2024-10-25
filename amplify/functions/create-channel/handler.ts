import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';

/**
 * This function creates a new Chime channel when creating a new channel(group chat) for chat message
 * @param event - Contains Request AppInstanceArn, Name, Mode, Privacy, Client Request Token, Chime Bearer, Expiration Criterion, and Expiration Days
 * @returns Channel ARN Response if successful, error message if failed
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Create a new Chime SDK Message instance
  const chime = new AWS.ChimeSDKMessaging({ region: Config.region });

  try {
    // Parse body from API Gateway event
    const { appInstanceArn, name, mode, privacy, clientRequestToken,
      chimeBearer, expirationCriterion, expirationDays } = JSON.parse(event.body || '{}');

    console.log('Creating channel with appInstanceArn: ', appInstanceArn,
      'name: ', name, 'mode:', mode, 'privacy: ', privacy,
      'clientRequestToken: ', clientRequestToken, 'chimeBearer: ', chimeBearer,
      'expirationCriterion: ', expirationCriterion, 'expirationDays: ', expirationDays);

    // Input validation
    if (!appInstanceArn || !name || !mode || !privacy || !expirationCriterion || !expirationDays) {
      console.error('Invalid input: appInstanceArn, name, mode, privacy, expirationCriterion, expirationDays are required.', {
        appInstanceArn, name, mode, privacy, expirationCriterion, expirationDays
      });
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid input: appInstanceArn, name, mode, privacy, expirationCriterion, expirationDays are required.'
        }),
        headers: Config.headers,
      };
    }

    // Token validation
    if (!clientRequestToken || !chimeBearer) {
      console.error('clientRequestToken and chimeBearer are invalid.', {
        clientRequestToken, chimeBearer
      });
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'clientRequestToken and chimeBearer are invalid.' }),
        headers: Config.headers,
      };
    }

    // Create a new Chime Channel
    const createChannelResponse = await chime.createChannel({
      AppInstanceArn: appInstanceArn,  // AppInstanceUserArn
      Name: name,  // Channel name
      Mode: mode,  // RESTRICTED or UNRESTRICTED
      Privacy: privacy,  // PUBLIC or PRIVATE
      ClientRequestToken: clientRequestToken,  // Unique channel identifier
      ChimeBearer: chimeBearer, // chime Bearer
      ExpirationSettings: {
        ExpirationCriterion: expirationCriterion, // Criteria for expiration
        ExpirationDays: expirationDays // Number of days for expiration
      }
    }).promise();

    console.log('Created Channel Response: ', createChannelResponse.ChannelArn);

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: createChannelResponse.ChannelArn,
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to Create Channel: ', { error, event });
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
