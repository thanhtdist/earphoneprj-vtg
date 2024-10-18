import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';

export const handler: APIGatewayProxyHandler = async (event) => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const chime = new AWS.ChimeSDKMessaging({ region });

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
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Enable CORS if needed
        },
      };
    }
    // Token validation
    if (!chimeBearer) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'ChimeBearer is invalid.' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Enable CORS if needed
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
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Enable CORS if needed
      },
    };
  } catch (error: any) {
    console.error('Error creating Channel Membership: ', { error, event });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Enable CORS if needed
      },
    };
  }
};
