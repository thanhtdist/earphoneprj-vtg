import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';

/**
 * This function creates a new Chime channel membership when adding a member to a channel(group chat)
 * @param event - Contains Request Channel ARN, Member ARN, Type, and Chime Bearer
 * @returns Channel Membership Response if successful, error message if failed
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Create a new Chime SDK Message instance
  const chime = new AWS.ChimeSDKMessaging({ region: "us-east-1" });

  try {
    // Parse body from API Gateway event
    const channelArn = event.pathParameters ? event.pathParameters.channelArn : null;
    const { memberArn, type, chimeBearer } = JSON.parse(event.body || '{}');

    console.log('Creating Channel Membership with channelArn: ', channelArn,
      'memberArn: ', memberArn, 'type:', type, 'chimeBearer: ', chimeBearer);
    // Input validation
    if (!channelArn || !memberArn || !type) {
      console.error('Invalid input: channelArn, memberArn, and type are required.', {
        channelArn, memberArn, type
      });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: channelArn, memberArn, and type are required.' }),
        headers: Config.headers,
      };
    }
    // Token validation
    if (!chimeBearer) {
      console.error('ChimeBearer is invalid.', { chimeBearer });
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'ChimeBearer is invalid.' }),
        headers: Config.headers,
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
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to Create Channel Membership: ', { error, event });
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
