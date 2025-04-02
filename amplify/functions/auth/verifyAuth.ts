import AWS from 'aws-sdk';
import jwt from 'jsonwebtoken';
import { Config } from '../config';

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
    throw new Error('Invalid or expired token');
  }

  const userId = decoded?.userId;
  if (!userId) {
    throw new Error('Invalid token payload');
  }

  // Initialize DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

  // Query user from DynamoDB
  const result = await dynamoDB.query({
    TableName: "Users",
    KeyConditionExpression: "userId = :userId",
    FilterExpression: "deleteFlag = :deleteFlag",
    ExpressionAttributeValues: {
      ":userId": userId,
      ":deleteFlag": 0
    }
  }).promise();

  if (!result.Items || result.Items.length === 0) {
    throw new Error('User not found');
  }

  return result.Items[0]; // Return user details
};
