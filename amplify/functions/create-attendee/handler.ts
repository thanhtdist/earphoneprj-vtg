import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';

export const handler: APIGatewayProxyHandler = async (event) => {
  const region = process.env.AWS_REGION || 'us-east-1';
  const chime = new AWS.ChimeSDKMeetings({ region });
  
  try {
    // Parse body from API Gateway event
    const meetingId = event.pathParameters ? event.pathParameters.MeetingID : null;
    const { externalUserId } = JSON.parse(event.body || '{}');

    console.log('Creating attendee with meetingId: ', meetingId, 'externalUserId: ', externalUserId);

    // Input validation
    if (!meetingId || !externalUserId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: meetingId and externalUserId are required.' }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Enable CORS if needed
        },
      };
    }

    // Create a new Chime meeting
    const attendeeResponse = await chime.createAttendee({
      MeetingId: meetingId, // Meeting ID 
      ExternalUserId: externalUserId  // Unique ID for each attendee (host or listener)
    }).promise();
    
    console.log('Created Chime Attendee: ', attendeeResponse.Attendee?.AttendeeId);

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: attendeeResponse.Attendee,
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
