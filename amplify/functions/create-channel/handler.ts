import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';

export const handler: APIGatewayProxyHandler = async (event) => {
  // Create a new Chime SDK Message instance
  const chime = new AWS.ChimeSDKMessaging({ region: Config.region });

  try {
    // Parse body from API Gateway event
    const { appInstanceArn, name, mode, privacy, clientRequestToken,
      chimeBearer, expirationCriterion, expirationDays } = JSON.parse(event.body || '{}');

    console.log('Creating channel with appInstanceArn: ', appInstanceArn,
      'name: ', name, 'mode:', mode, 'privacy: ',
      privacy, 'clientRequestToken: ', clientRequestToken, 'chimeBearer: ', chimeBearer);

    // Input validation
    if (!appInstanceArn || !name || !mode || !privacy || !expirationCriterion || !expirationDays) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid input: appInstanceArn, name, mode, and privacy are required.'
        }),
        headers: {
          'Content-Type': Config.contentType, // json type
          'Access-Control-Allow-Origin': Config.accessControlAllowOrigin, // Enable CORS
        },
      };
    }

    // Token validation
    if (!clientRequestToken || !chimeBearer) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'clientRequestToken and chimeBearer are invalid.' }),
        headers: {
          'Content-Type': Config.contentType, // json type
          'Access-Control-Allow-Origin': Config.accessControlAllowOrigin, // Enable CORS
        },
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
      headers: {
        'Content-Type': Config.contentType, // json type
        'Access-Control-Allow-Origin': Config.accessControlAllowOrigin, // Enable CORS
      },
    };
  } catch (error: any) {
    console.error('Error creating Channel: ', { error, event });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: {
        'Content-Type': Config.contentType, // json type
        'Access-Control-Allow-Origin': Config.accessControlAllowOrigin, // Enable CORS
      },
    };
  }
};
