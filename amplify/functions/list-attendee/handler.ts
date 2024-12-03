import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';

/**
 * This function lists all channel memberships for a given channel ARN
 * and calculates the total number of memberships.
 * @param event - Contains Request Channel ARN and Chime Bearer
 * @returns Channel Membership Response if successful, error message if failed
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Create a new Chime SDK Message instance
  const chime = new AWS.ChimeSDKMeetings({ region: Config.region });

  try {
    // Retrieve meeting parameters from query string
    const meetingId = event.pathParameters ? event.pathParameters.MeetingID : null;
    console.log('List Attendees with meetingId: ', meetingId);

    // Input validation
    if (!meetingId) {
      console.log('Invalid input: meetingId is required.', { meetingId });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: meetingId is required.' }),
        headers: Config.headers,
      };
    }


    let attendeesList = [] as any; // List of Channel Memberships
    let totalattendeeCount = 0; // Total Membership Count
    let NextToken: string | undefined = undefined;

    do {
      // Call listChannelMemberships with pagination
      const createChannelMembershipResponse = await chime.listAttendees({
        MeetingId: meetingId, // Meeting ID
        MaxResults: 100, // Max results per page, Minimum value of 1. Maximum value of 100.
        NextToken // NextToken for pagination
      }).promise();

      // Increment total membership count by the current batch if ChannelMemberships is defined
      const attendees = createChannelMembershipResponse.Attendees ?? [];
      attendeesList = attendeesList.concat(attendees);
      totalattendeeCount += attendees.length;

      // Set NextToken for the next iteration
      NextToken = createChannelMembershipResponse.NextToken;

      console.log('Current batch size:', attendees.length);
    } while (NextToken);

    console.log('Total attendees count:', totalattendeeCount);
    console.log('List attendees:', attendeesList);

    // Return successful response with total membership count
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          count: totalattendeeCount,
          attendees: attendeesList
        }
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to Get List Attendees: ', { error, event });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
