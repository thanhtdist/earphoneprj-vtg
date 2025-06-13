import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
//import { Config } from '../../../configs/config';
import { Config } from '@configs/config';
import bcrypt from 'bcryptjs';
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
    // Parse email and password from the request body
    const { email, password } = JSON.parse(event.body || '{}');
    if (!email || !password) {
      console.error('Invalid input: Missing email or password.');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: email & password is required.' }),
        headers: Config.headers,
      };
    }

    console.log('Retrieving user with email: ', email);
    // Query DynamoDB for the user with the provided email and deleteFlag=0
    const result = await dynamoDB.query({
      TableName: Config.dbTables.USERS,
      IndexName: "email-index",  // Using GSI to query by email
      KeyConditionExpression: "email = :email",
      FilterExpression: "deleteFlag = :deleteFlag AND active = :active",
      ExpressionAttributeValues: {
        ":email": email,
        ":deleteFlag": 0,
        ":active": 0,
      },
    }).promise();

    if (!result.Items || result.Items.length === 0) {
      console.error('User not found or deleted: ', { email });
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found or deleted.' }),
        headers: Config.headers,
      };
    }

    const user = result.Items[0];
    console.log('User successfully retrieved: ', user);

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.error('Invalid password for user: ', { email });
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid password.' }),
        headers: Config.headers,
      };
    }

    // const cookie = `userInfo=${encodeURIComponent(JSON.stringify({
    //   userId: user.userId,
    //   username: user.username,
    //   role: user.role
    // }))}; Path=/; HttpOnly; Secure; SameSite=None`;
    // Generate tokens
    const accessToken = jwt.sign({ userId: user.userId }, Config.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.userId }, Config.refreshSecret, { expiresIn: '7d' });

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Login successfully",
        data: {
          accessToken,
          refreshToken,
        },
      }),
      headers: Config.headers,
      // headers: {
      //   ...Config.headers,
      //   'Set-Cookie': cookie,
      // },
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
