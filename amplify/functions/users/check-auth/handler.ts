import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
// import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * This function retrieves a user by email from AWS DynamoDB and verifies the password.
 * @param event - Contains the body with email and password.
 * @returns Response with login success or error.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Initialize DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });
  try {
    const rawToken = event.headers.Authorization || '';
    const token = rawToken.replace(/^Bearer\s+/, '');
    console.log('Token (cleaned): ', token);
    // Check if token is provided
    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Missing token' }),
        headers: Config.headers,
      };
    }

    // The secret key should be the same as the one used to sign the token
    console.log('Verifying token...', Config.jwtSecret);
    // Verify token and check expiration
    let decoded: any;
    try {
      decoded = jwt.verify(token, Config.jwtSecret);
    } catch (error) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid or expired token' }),
        headers: Config.headers,
      };
    }
    // Check if userId exists in DB
    const userId = decoded?.userId;
    console.log('userId: ', userId);
    // Check if userId is present in the token payload
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid token payload' }),
        headers: Config.headers,
      };
    }

    const result = await dynamoDB.query({
      TableName: Config.dbTables.USERS,
      KeyConditionExpression: "userId = :userId",
      FilterExpression: "deleteFlag = :deleteFlag",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":deleteFlag": 0
      }
    }).promise();

    console.log('DynamoDB result: ', result);

    if (!result.Items || result.Items.length === 0) {
      console.error('User not found: ', { userId });
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found.' }),
        headers: Config.headers,
      };
    }

    // Return user info
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Check auth retrieved successfully",
        data: {
          userId: result.Items[0].userId,
          userName: result.Items[0].userName,
          email: result.Items[0].email,
        }
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to check auth: ', { error, event });
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
