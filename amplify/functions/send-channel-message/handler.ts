import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';

export const handler: APIGatewayProxyHandler = async (event) => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const chime = new AWS.ChimeSDKMessaging({ region });

  try {
    // Parse body from API Gateway event
    console.log('Event: ', event);
    console.log('Event body: ', event.body);
    //const { clientRequestToken, externalMeetingId } = JSON.parse(event.body || '{}'); // Ensure parsing from body
    // const { clientRequestToken, externalMeetingId } = JSON.parse(event.body || '{}');// Ensure parsing from body
    const channelArn = event.pathParameters ? event.pathParameters.channelArn : null;
    const { content, type, persistence, clientRequestToken, chimeBearer } = JSON.parse(event.body || '{}');

    console.log('Creating Send Channel Message with channelArn: ', channelArn,
      'type:', type, 'persistence:', persistence, 'clientRequestToken:', clientRequestToken, "chimeBearer:", chimeBearer);
    // Input validation
    if (!channelArn || !persistence || !type || !clientRequestToken || !chimeBearer) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: channelArn, persistence, type, clientRequestToken and chimeBearer are required.' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Enable CORS if needed
        },
      };
    }

    // Create a new Chime Channel
    const sendChannelMessageResponse = await chime.sendChannelMessage({
      ChannelArn: decodeURIComponent(channelArn),  // AppInstanceUserArn
      Content: content,  // Must be a unique channel name
      Type: type,  // RESTRICTED or UNRESTRICTED
      Persistence: persistence,  // PUBLIC or PRIVATE
      ClientRequestToken: clientRequestToken,  // Unique channel identifier
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
