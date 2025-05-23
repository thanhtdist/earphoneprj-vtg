import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
import { verifyAuth } from '../../utils/verifyAuth'; // Import auth function
/**
 * This function retrieves a user by userId from AWS DynamoDB.
 * @param event - Contains the path parameters with userId.
 * @returns Response with the user details or error.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Initialize DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

  try {

    // Authenticate the user
    const authHeader = event.headers?.Authorization || '';
    console.log('Auth Header: ', authHeader);
    const user = await verifyAuth(authHeader);
    console.log('Authenticated User:', user);

    // Get userId from path parameters
    const userId = event.pathParameters ? event.pathParameters.UserID : null;

    if (!userId) {
      console.error('Invalid input: Missing userId.');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: userId is required.' }),
        headers: Config.headers,
      };
    }

    console.log('Retrieving user with userId: ', userId);

    // Query DynamoDB for the user with the specified userId
    const result = await dynamoDB.get({
      TableName: Config.dbTables.USERS,
      Key: { userId },
    }).promise();

    if (!result.Item) {
      console.error('user not found: ', { userId });
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'user not found.' }),
        headers: Config.headers,
      };
    }

    console.log('user successfully retrieved: ', result.Item);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "user retrieved successfully",
        data: result.Item,
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to retrieve user: ', { error, event });

    // Return error response
    return {
      statusCode: error?.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
