import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';

/**
 * This function retrieves a tour by tourId from AWS DynamoDB.
 * @param event - Contains the path parameters with tourId.
 * @returns Response with the tour details or error.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Initialize DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

  try {
    // Get tourId from path parameters
    // const email = event.pathParameters ? event.pathParameters.email : null;
    const {email} = JSON.parse(event.body || '{}');
    if (!email) {
      console.error('Invalid input: Missing email.');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: email is required.' }),
        headers: Config.headers,
      };
    }

    console.log('Retrieving user with email: ', email);
    const userItem = {     
      email,   
    };
    // Query DynamoDB for Users with email
    const result = await dynamoDB.get({
      TableName: "Users",
      Key: userItem,
    }).promise();

    if (!result.Item) {
      console.error('user not found: ', { email });
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'user not found.' }),
        headers: Config.headers,
      };
    }

    console.log('User successfully retrieved: ', result.Item);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Login successfully",
        data: result.Item,
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to Login: ', { error, event });

    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
