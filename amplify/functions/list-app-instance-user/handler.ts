import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';

/**
 * This function creates a new Chime App Instance User when adding a user to an App Instance for chat messaging
 * @param event - Contains Request App Instance ARN, App Instance User ID, Client Request Token, Name, Expiration Criterion, and Expiration Days
 * @returns App Instance User ARN Response if successful, error message if failed 
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Create a new Chime SDK Identity instance
  const chime = new AWS.ChimeSDKIdentity({ region: "us-east-1" });

  try {
    // Parse body from API Gateway event
    const appInstanceArn = event.queryStringParameters ? event.queryStringParameters?.appInstanceArn : null;

    console.log('Creating App Instance User with appInstanceArn: ', appInstanceArn);

    // Input validation
    if (!appInstanceArn) {
      console.error('Invalid input: appInstanceArn is required.', {
        appInstanceArn,
      });
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            'Invalid input: appInstanceArn is required.'
        }),
        headers: Config.headers,
      };
    }



    let appInstanceUsersList = [] as any; // List of Channel Memberships
    let totalAppInstanceUsersCount = 0; // Total Membership Count
    let NextToken: string | undefined = undefined;

    do {
      // Call listChannelMemberships with pagination
      const listAppInstanceUsersResponse = await chime.listAppInstanceUsers({
        AppInstanceArn: decodeURIComponent(appInstanceArn), // Channel Arn
        MaxResults: 50, // Max results per page, Minimum value of 1. Maximum value of 50.
        NextToken // NextToken for pagination
      }).promise();

      // Increment total membership count by the current batch if ChannelMemberships is defined
      const memberships = listAppInstanceUsersResponse.AppInstanceUsers ?? [];
      appInstanceUsersList = appInstanceUsersList.concat(memberships);
      totalAppInstanceUsersCount += memberships.length;

      // Set NextToken for the next iteration
      NextToken = listAppInstanceUsersResponse.NextToken;

      console.log('Current batch size:', memberships.length);
    } while (NextToken);

    console.log('Total appInstanceUsers Count:', totalAppInstanceUsersCount);
    console.log('List appInstanceUsers:', appInstanceUsersList);

    // Return successful response with total membership count
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          count: totalAppInstanceUsersCount,
          appInstanceUsers: appInstanceUsersList
        }
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to List App Instance User: ', { error, event });
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
