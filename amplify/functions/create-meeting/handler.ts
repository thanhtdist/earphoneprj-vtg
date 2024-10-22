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
    const { clientRequestToken, externalMeetingId } = JSON.parse(event.body || '{}');

    console.log('Creating meeting with clientRequestToken: ', clientRequestToken, 'externalMeetingId: ', externalMeetingId);

    // Input validation
    if (!externalMeetingId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: externalMeetingId is required.' }),
        headers: {
          'Content-Type': Config.contentType, // json type
          'Access-Control-Allow-Origin': Config.accessControlAllowOrigin, // Enable CORS
        },
      };
    }

    // Token validation
    if (!clientRequestToken) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'clientRequestToken is invalid.' }),
        headers: {
          'Content-Type': Config.contentType, // json type
          'Access-Control-Allow-Origin': Config.accessControlAllowOrigin, // Enable CORS
        },
      };
    }

    // Create a new Chime meeting
    const meetingResponse = await chime.createMeeting({
      ClientRequestToken: clientRequestToken, // Unique meeting identifier
      ExternalMeetingId: externalMeetingId, // External meeting identifier
      MediaRegion: Config.region, // Region for the meeting
      MeetingFeatures: {
        Audio: {
          EchoReduction: "AVAILABLE" // remove echo from the meeting
        },
        Video: {
          MaxResolution: "None" // No video for the meeting, audio only
        },
        Content: {
          MaxResolution: "None" // No content sharing for the meeting, audio only
        }
      }
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
