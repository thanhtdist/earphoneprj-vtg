import AWS from 'aws-sdk';
import jwt from 'jsonwebtoken';
import { Config } from '@configs/config';

/**
 * Verifies the token and retrieves the user from DynamoDB.
 * @param authHeader - The Authorization header from the request.
 * @returns User object if valid, or throws an error if invalid.
 */
export const verifyAuth = async (authHeader?: string) => {
  if (!authHeader) {
    throw new Error('Missing token');
  }

  const token = authHeader.replace(/^Bearer\s+/, '');
  let decoded: any;

  try {
    decoded = jwt.verify(token, Config.jwtSecret);
  } catch (error) {
    //throw new Error('Invalid or expired token');
    throw Object.assign(new Error('Invalid or expired token'), { statusCode: 401 });
  }

  const userId = decoded?.userId;
  if (!userId) {
    throw Object.assign(new Error('Invalid token payload'), { statusCode: 401 });
  }

  // Initialize DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

  // Query user from DynamoDB
  const result = await dynamoDB.query({
    TableName: Config.dbTables.USERS,
    KeyConditionExpression: "userId = :userId",
    FilterExpression: "deleteFlag = :deleteFlag",
    ExpressionAttributeValues: {
      ":userId": userId,
      ":deleteFlag": 0
    }
  }).promise();

  if (!result.Items || result.Items.length === 0) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  return result.Items[0]; // Return user details
};
