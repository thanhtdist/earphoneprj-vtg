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
    if (!channelArn || !memberArn || !type || !chimeBearer) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: channelArn, memberArn, type and chimeBearer are required.' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Enable CORS if needed
        },
      };
    }

    // Create a new Chime Channel
    const createChannelMembershipResponse = await chime.createChannelMembership({
      ChannelArn: decodeURIComponent(channelArn),  // AppInstanceUserArn
      MemberArn: memberArn,  // Must be a unique channel name
      Type: type,  // RESTRICTED or UNRESTRICTED
      ChimeBearer: chimeBearer // chime Bearer
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
