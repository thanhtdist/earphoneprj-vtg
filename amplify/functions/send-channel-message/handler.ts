import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';

export const handler: APIGatewayProxyHandler = async (event) => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const chime = new AWS.ChimeSDKMessaging({ region });

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
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Enable CORS if needed
        },
      };
    }

    // Token validation
    if (!clientRequestToken || !chimeBearer) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'clientRequestToken and chimeBearer are invalid.' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Enable CORS if needed
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
