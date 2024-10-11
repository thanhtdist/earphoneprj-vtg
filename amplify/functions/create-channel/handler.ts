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
    const { appInstanceArn, name, mode, privacy, clientRequestToken, chimeBearer, expirationCriterion, expirationDays } = JSON.parse(event.body || '{}');

    console.log('Creating channel with appInstanceArn: ', appInstanceArn,
      'name: ', name, 'mode:', mode, 'privacy: ',
      privacy, 'clientRequestToken: ', clientRequestToken, 'chimeBearer: ', chimeBearer);

    // Input validation
    if (!appInstanceArn || !name || !mode || !privacy || !clientRequestToken || !chimeBearer || !expirationCriterion || !expirationDays) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: appInstanceArn, name, mode, privacy, clientRequestToken and chimeBearer are required.' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Enable CORS if needed
        },
      };
    }

    // Create a new Chime Channel
    const createChannelResponse = await chime.createChannel({
      AppInstanceArn: appInstanceArn,  // AppInstanceUserArn
      Name: name,  // Must be a unique channel name
      Mode: mode,  // RESTRICTED or UNRESTRICTED
      Privacy: privacy,  // PUBLIC or PRIVATE
      ClientRequestToken: clientRequestToken,  // Unique channel identifier
      ChimeBearer: chimeBearer, // chime Bearer
      ExpirationSettings: {
        ExpirationCriterion: expirationCriterion,
        ExpirationDays: expirationDays
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
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Enable CORS if needed
      },
    };
  } catch (error: any) {
    console.error('Error creating Channel: ', { error, event });
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
