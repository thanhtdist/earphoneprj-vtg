import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';

/**
 * This function creates a new Chime meeting when starting a live audio stream.
 * @param event - Contains Request Metting clientRequestToken and externalMeetingId
 * @returns Meeting Response if successful, error message if failed
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Create a new Chime SDK Meeting instance
  const chime = new AWS.ChimeSDKMeetings({ region: Config.region });

  try {
    // Parse body from API Gateway event
    const meetingId = event.pathParameters ? event.pathParameters.MeetingID : null;
    const { languageCode, partialResultsStability } = JSON.parse(event.body || '{}');

    console.log('Start MeetingTranscription with meetingId: ', meetingId, 'languageCode: ', languageCode, 'partialResultsStability: ', partialResultsStability);

    // Input validation
    if (!meetingId || !languageCode) {
      console.error('Invalid input: meetingId and languageCode are required.', { meetingId, languageCode });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: meetingId and languageCode are required.' }),
        headers: Config.headers,
      };
    }

    // Create a new Chime meeting
    const startMeetingTranscriptionResponse = await chime.startMeetingTranscription({
      MeetingId: meetingId,
      TranscriptionConfiguration: {
        EngineTranscribeSettings: {
          LanguageCode: languageCode, // LanguageCode: 'en-US',
          Region: Config.region, // Region
          EnablePartialResultsStabilization: true,
          PartialResultsStability: partialResultsStability,
        }
      }
    }).promise();

    console.log('Started Meeting Transcription Response: ', startMeetingTranscriptionResponse);

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({ data: 'Transcription started successfully' }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to start transcription: ', { error, event });
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
