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
    const { appInstanceArn, appInstanceUserId, clientRequestToken,
      name, expirationCriterion, expirationDays } = JSON.parse(event.body || '{}');

    console.log('Creating App Instance User with appInstanceArn: ', appInstanceArn,
      'appInstanceUserId: ', appInstanceUserId,
      'clientRequestToken: ', clientRequestToken, 'name: ', name,
      'expirationCriterion: ', expirationCriterion, 'expirationDays: ', expirationDays);

    // Input validation
    if (!appInstanceArn || !appInstanceUserId || !name || !expirationCriterion || !expirationDays) {
      console.error('Invalid input: appInstanceArn, appInstanceUserId, name, expirationCriterion, expirationDays are required.', {
        appInstanceArn, appInstanceUserId, name, expirationCriterion, expirationDays
      });
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            'Invalid input: appInstanceArn, appInstanceUserId, name, expirationCriterion and expirationDays are required.'
        }),
        headers: Config.headers,
      };
    }

    // Token validation
    if (!clientRequestToken) {
      console.error('clientRequestToken is invalid.', { clientRequestToken });
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'clientRequestToken is invalid.' }),
        headers: Config.headers,
      };
    }

    // Create a new Chime meeting
    const createAppInstanceUserResponse = await chime.createAppInstanceUser({
      AppInstanceArn: appInstanceArn, // App Instance Arn
      AppInstanceUserId: appInstanceUserId,  // Unique ID for each app instance user (host or listener)
      ClientRequestToken: clientRequestToken,  // Unique app instance user identifier
      Name: name,  // App instance user name
      ExpirationSettings: {
        ExpirationCriterion: expirationCriterion, // Criteria for expiration
        ExpirationDays: expirationDays // Number of days for expiration
      }
    }).promise();

    console.log('Created App Instance User Response: ', createAppInstanceUserResponse.AppInstanceUserArn);

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: createAppInstanceUserResponse.AppInstanceUserArn,
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to Create App Instance User: ', { error, event });
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
