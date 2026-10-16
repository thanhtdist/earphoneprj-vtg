import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';

/**
 * This function stops the transcription of a Chime meeting. The Guide calls it before starting the
 * transcription again with another spoken language: a meeting has one transcription only, shared by
 * everyone, so the language of a running transcription cannot be changed without stopping it first.
 * @param event - Contains the meeting ID in the path parameters (MeetingID)
 * @returns 200 if the transcription was stopped, 400 if the meeting ID is missing, 500 if Chime refused
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Create a new Chime SDK Meeting instance
  const chime = new AWS.ChimeSDKMeetings({ region: Config.region });

  try {
    const meetingId = event.pathParameters ? event.pathParameters.MeetingID : null;

    console.log('Stop MeetingTranscription with meetingId: ', meetingId);

    // Input validation
    if (!meetingId) {
      console.error('Invalid input: meetingId is required.', { meetingId });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: meetingId is required.' }),
        headers: Config.headers,
      };
    }

    const stopMeetingTranscriptionResponse = await chime.stopMeetingTranscription({
      MeetingId: meetingId,
    }).promise();

    console.log('Stopped Meeting Transcription Response: ', stopMeetingTranscriptionResponse);

    return {
      statusCode: 200,
      body: JSON.stringify({ data: 'Transcription stopped successfully' }),
      headers: Config.headers,
    };
  } catch (error: any) {
    // The error code is logged on purpose: it tells apart "no transcription is running" from a real failure
    console.error('Failed to stop transcription: ', { code: error.code, message: error.message, event });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error', code: error.code }),
      headers: Config.headers,
    };
  }
};
