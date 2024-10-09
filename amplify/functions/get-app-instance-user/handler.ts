import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';

export const handler: APIGatewayProxyHandler = async (event) => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const chime = new AWS.ChimeSDKIdentity({ region });
  
  try {
    // Parse body from API Gateway event
    console.log('Event XXX: ', event);
    console.log('Event body: ', event.body);
    //const { clientRequestToken, externalMeetingId } = JSON.parse(event.body || '{}'); // Ensure parsing from body
    // const { clientRequestToken, externalMeetingId } = JSON.parse(event.body || '{}');// Ensure parsing from body
    // const { appInstanceUserArn } = JSON.parse(event.body || '{}');
    //const appInstanceUserArn = event.queryStringParameters?.appInstanceUserArn;
    const appInstanceUserArn = event.pathParameters ? event.pathParameters.appInstanceUserArn : null;

    console.log('Getting App Instance User with appInstanceUserArn: ', appInstanceUserArn);

    // Input validation
    if (!appInstanceUserArn) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: appInstanceUserArn is required.' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Enable CORS if needed
        },
      };
    }

    // Create a new Chime meeting
    const getAppInstanceUserResponse = await chime.describeAppInstanceUser({
      AppInstanceUserArn: decodeURIComponent(appInstanceUserArn), // App Instance User Arn 
    }).promise();
    
    console.log('Got App Instance User: ', getAppInstanceUserResponse.AppInstanceUser);

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: getAppInstanceUserResponse.AppInstanceUser,
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
