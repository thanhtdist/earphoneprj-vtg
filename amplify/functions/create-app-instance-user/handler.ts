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
  const chime = new AWS.ChimeSDKIdentity({ region: Config.region });

  try {
    // Parse body from API Gateway event
    const { appInstanceArn, appInstanceUserId, clientRequestToken,
      name, expirationCriterion, expirationDays } = JSON.parse(event.body || '{}');

    console.log('Creating App Instance User with appInstanceArn: ', appInstanceArn, 'appInstanceUserId: ',
      appInstanceUserId, 'clientRequestToken: ', clientRequestToken, 'name: ', name);

    // Input validation
    if (!appInstanceArn || !appInstanceUserId || !name || !expirationCriterion || !expirationDays) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            'Invalid input: appInstanceArn, appInstanceUserId, name, expirationCriterion and expirationDays are required.'
        }),
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

    console.log('Created App Instance User: ', createAppInstanceUserResponse.AppInstanceUserArn);

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: createAppInstanceUserResponse.AppInstanceUserArn,
      }),
      headers: {
        'Content-Type': Config.contentType, // json type
        'Access-Control-Allow-Origin': Config.accessControlAllowOrigin, // Enable CORS
      },
    };
  } catch (error: any) {
    console.error('Error creating App Instance User: ', { error, event });
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
