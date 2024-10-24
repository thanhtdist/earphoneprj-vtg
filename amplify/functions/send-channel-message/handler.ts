import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';

/**
 * This function creates a new Chime channel message when sending a message to a channel(group chat)
 * @param event - Contains Request Channel ARN, Content, Type, Persistence, Client Request Token, and Chime Bearer
 * @returns Channel Message Response if successful, error message if failed
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Create a new Chime SDK Message instance
  const chime = new AWS.ChimeSDKMessaging({ region: Config.region });

  try {
    // Parse body from API Gateway event
    const channelArn = event.pathParameters ? event.pathParameters.channelArn : null;
    const { content, type, persistence, clientRequestToken, chimeBearer } = JSON.parse(event.body || '{}');

    console.log('Creating Send Channel Message with channelArn: ', channelArn,
      'type:', type, 'persistence:', persistence, 'clientRequestToken:', clientRequestToken, "chimeBearer:", chimeBearer);
    // Input validation
    if (!channelArn || !persistence || !type) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: channelArn, persistence, and type are required.' }),
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
    const sendChannelMessageResponse = await chime.sendChannelMessage({
      ChannelArn: decodeURIComponent(channelArn),  // Channel ARN
      Content: content,  // Content of the message
      Type: type,  // "STANDARD" or "CONTROL"
      Persistence: persistence,  // "PERSISTENT" or "NON_PERSISTENT"
      ClientRequestToken: clientRequestToken,  // Unique message identifier
      ChimeBearer: chimeBearer // chime Bearer
    }).promise();

    console.log('Created Send Channel Message Response: ', sendChannelMessageResponse);

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: sendChannelMessageResponse,
      }),
      headers: {
        'Content-Type': Config.contentType, // json type
        'Access-Control-Allow-Origin': Config.accessControlAllowOrigin, // Enable CORS
      },
    };
  } catch (error: any) {
    console.error('Error creating Channel Membership: ', { error, event });
    // Return error response
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
