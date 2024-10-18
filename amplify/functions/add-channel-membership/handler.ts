import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';

export const handler: APIGatewayProxyHandler = async (event) => {
  // Create a new Chime SDK Message instance
  const chime = new AWS.ChimeSDKMessaging({ region: Config.region });

  try {
    // Parse body from API Gateway event
    const channelArn = event.pathParameters ? event.pathParameters.channelArn : null;
    const { memberArn, type, chimeBearer } = JSON.parse(event.body || '{}');

    console.log('Creating Channel Membership with channelArn: ', channelArn,
      'memberArn: ', memberArn, 'type:', memberArn, 'chimeBearer: ', chimeBearer);
    // Input validation
    if (!channelArn || !memberArn || !type) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: channelArn, memberArn, and type are required.' }),
        headers: {
          'Content-Type': Config.contentType, // json type
          'Access-Control-Allow-Origin': Config.accessControlAllowOrigin, // Enable CORS
        },
      };
    }
    // Token validation
    if (!chimeBearer) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'ChimeBearer is invalid.' }),
        headers: {
          'Content-Type': Config.contentType, // json type
          'Access-Control-Allow-Origin': Config.accessControlAllowOrigin, // Enable CORS
        },
      };
    }

    // Create a new Chime Channel
    const createChannelMembershipResponse = await chime.createChannelMembership({
      ChannelArn: decodeURIComponent(channelArn),  // ChannelArn
      MemberArn: memberArn,  // Member name
      Type: type,  // "DEFAULT" or "HIDDEN"
      ChimeBearer: chimeBearer // chime Bearer token as AppInstanceUserArn
    }).promise();

    console.log('Created Channel Membership Response: ', createChannelMembershipResponse);

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: createChannelMembershipResponse,
      }),
      headers: {
        'Content-Type': Config.contentType, // json type
        'Access-Control-Allow-Origin': Config.accessControlAllowOrigin, // Enable CORS
      },
    };
  } catch (error: any) {
    console.error('Error creating Channel Membership: ', { error, event });
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
