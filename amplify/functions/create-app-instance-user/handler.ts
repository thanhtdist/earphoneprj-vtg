import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';

export const handler: APIGatewayProxyHandler = async (event) => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const chime = new AWS.ChimeSDKIdentity({ region });
  
  try {
    // Parse body from API Gateway event
    const { appInstanceArn, appInstanceUserId, clientRequestToken, name, expirationCriterion, expirationDays } = JSON.parse(event.body || '{}');

    console.log('Creating App Instance User with appInstanceArn: ', appInstanceArn, 'appInstanceUserId: ', appInstanceUserId, 'clientRequestToken: ', clientRequestToken, 'name: ', name);

    // Input validation
    if (!appInstanceArn || !appInstanceUserId || !clientRequestToken || !name || !expirationCriterion || !expirationDays) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: appInstanceArn, appInstanceUserId, clientRequestToken, name  expirationCriterion and expirationDays are required.' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Enable CORS if needed
        },
      };
    }

    // Create a new Chime meeting
    const createAppInstanceUserResponse = await chime.createAppInstanceUser({
      AppInstanceArn: appInstanceArn, // App Instance Arn
      AppInstanceUserId: appInstanceUserId,  // Unique ID for each attendee (host or listener)
      ClientRequestToken: clientRequestToken,  // Unique attendee identifier
      Name: name,  // Attendee name
      ExpirationSettings: {
        ExpirationCriterion: expirationCriterion,
        ExpirationDays: expirationDays
      }
    }).promise();
    
    console.log('Created App Instance User: ', createAppInstanceUserResponse.AppInstanceUserArn);

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: createAppInstanceUserResponse.AppInstanceUserArn,
      }),
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Enable CORS if needed
      },
    };
  } catch (error: any) {
    console.error('Error creating App Instance User: ', { error, event });
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
