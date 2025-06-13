import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
import jwt from 'jsonwebtoken';

/**
 * This function handles token refresh logic.
 * @param event - Contains the body with the refresh token.
 * @returns Response with a new access token or an error.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

  try {
    const rawToken = event.headers.Authorization || '';
    const refreshToken = rawToken.replace(/^Bearer\s+/, '');
    console.log('Refresh Token (cleaned): ', refreshToken);

    if (!refreshToken) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Missing refresh token' }),
        headers: Config.headers,
      };
    }

    // Decode the refresh token with verification to extract userId
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, Config.refreshSecret);
      console.log('Decoded refresh token: ', decoded);
    } catch (error) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid refresh token' }),
        headers: Config.headers,
      };
    }

    const userId = decoded?.userId;
    console.log('Extracted userId: ', userId);
    if (!userId) {
      return {
        statusCode: 401,
        body: JSON.stringify({ message: 'Invalid token payload' }),
        headers: Config.headers,
      };
    }

    // Fetch user from DynamoDB
    const result = await dynamoDB.query({
      TableName: Config.dbTables.USERS,
      KeyConditionExpression: "userId = :userId",
      FilterExpression: "deleteFlag = :deleteFlag",
      ExpressionAttributeValues: {
        ":userId": userId,
        ":deleteFlag": 0,
      },
    }).promise();
    console.log('DynamoDB query result: ', result);

    if (!result.Items || result.Items.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found.' }),
        headers: Config.headers,
      };
    }

    // Assuming the first item is the user we want
    const user = result.Items[0];

    // Generate a new access token
    const newAccessToken = jwt.sign({ userId: user.userId }, Config.jwtSecret, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ userId: user.userId }, Config.refreshSecret, { expiresIn: '7d' });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Token refreshed successfully",
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to refresh token: ', { error, event });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
