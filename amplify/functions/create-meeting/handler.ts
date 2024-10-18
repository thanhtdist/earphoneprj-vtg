import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { CONTENT_TYPE, REGION } from '../config';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('ContentType: ', CONTENT_TYPE);
  console.log('Region: ', REGION);
  //const region = process.env.AWS_REGION || 'us-east-1';
  const chime = new AWS.ChimeSDKMeetings({ region: REGION });

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
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Enable CORS if needed
        },
      };
    }

    // Token validation
    if (!clientRequestToken) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'clientRequestToken is invalid.' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Enable CORS if needed
        },
      };
    }

    // Create a new Chime meeting
    const meetingResponse = await chime.createMeeting({
      ClientRequestToken: clientRequestToken, // Unique meeting identifier
      ExternalMeetingId: externalMeetingId, // External meeting identifier
      MediaRegion: REGION, // Region for the meeting
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
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Enable CORS if needed
      },
    };
  } catch (error: any) {
    console.error('Error creating meeting: ', { error, event });
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
