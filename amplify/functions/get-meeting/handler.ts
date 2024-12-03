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
  const chime = new AWS.ChimeSDKMeetings({ region: "ap-southeast-1" });

  try {
    // Retrieve meeting parameters from query string
    const meetingId = event.pathParameters ? event.pathParameters.MeetingID : null;
    console.log('Getting meeting with meetingId: ', meetingId);

    // Input validation
    if (!meetingId) {
      console.log('Invalid input: meetingId is required.', { meetingId });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: meetingId is required.' }),
        headers: Config.headers,
      };
    }

    // Create a new Chime meeting
    const meetingResponse = await chime.getMeeting({
      MeetingId: meetingId // Meeting ID
    }).promise();

    console.log('Get Meeting Response: ', meetingResponse.Meeting?.MeetingId);

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: meetingResponse.Meeting,
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to Get Meeting: ', { error, event });
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
