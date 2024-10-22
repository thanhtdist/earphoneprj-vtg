import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';

/**
 * This function retrieves a Chime meeting after starting a live audio stream.
 * @param event - Contains Request Meeting ID
 * @returns Meeting Response if successful, error message if failed
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Create a new Chime SDK Meeting instance
  const chime = new AWS.ChimeSDKMeetings({ region: Config.region });

  try {
    // Retrieve meeting parameters from query string
    const meetingId = event.pathParameters ? event.pathParameters.MeetingID : null;
    console.log('Creating meeting with meetingId: ', meetingId);

    // Input validation
    if (!meetingId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: meetingId are required.' }),
        headers: {
          'Content-Type': Config.contentType, // json type
          'Access-Control-Allow-Origin': Config.accessControlAllowOrigin, // Enable CORS
        },
      };
    }

    // Create a new Chime meeting
    const meetingResponse = await chime.getMeeting({
      MeetingId: meetingId // Meeting ID
    }).promise();

    console.log('Created Chime meeting: ', meetingResponse.Meeting?.MeetingId);

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: meetingResponse.Meeting,
      }),
      headers: {
        'Content-Type': Config.contentType, // json type
        'Access-Control-Allow-Origin': Config.accessControlAllowOrigin, // Enable CORS
      },
    };
  } catch (error: any) {
    console.error('Error creating meeting: ', { error, event });
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
