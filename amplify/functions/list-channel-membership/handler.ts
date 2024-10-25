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
  const chime = new AWS.ChimeSDKMessaging({ region: Config.region });

  try {
    console.log('Event listChannelMemberships: ', event);
    // Parse body from API Gateway event
    const channelArn = event.pathParameters ? event.pathParameters.channelArn : null;
    const chimeBearer = event.headers['x-amz-chime-bearer'];

    console.log('List Channel Membership with channelArn: ', channelArn, 'chimeBearer: ', chimeBearer);
    if (!channelArn || !chimeBearer) {
      console.error('Invalid input');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: channelArn and chimeBearer are required.' }),
        headers: Config.headers,
      };
    }

    let totalMembershipCount = 0;
    let NextToken: string | undefined = undefined;

    do {
      // Call listChannelMemberships with pagination
      const createChannelMembershipResponse = await chime.listChannelMemberships({
        ChannelArn: decodeURIComponent(channelArn),
        MaxResults: 2,
        ChimeBearer: chimeBearer,
        NextToken
      }).promise();

      // Increment total membership count by the current batch if ChannelMemberships is defined
      const memberships = createChannelMembershipResponse.ChannelMemberships ?? [];
      totalMembershipCount += memberships.length;

      // Set NextToken for the next iteration
      NextToken = createChannelMembershipResponse.NextToken;

      console.log('Current batch size:', memberships.length);
    } while (NextToken);

    console.log('Total Membership Count:', totalMembershipCount);

    // Return successful response with total membership count
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: totalMembershipCount
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to Get List Channel Membership: ', { error, event });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
