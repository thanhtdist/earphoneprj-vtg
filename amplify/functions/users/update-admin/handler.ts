import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
import bcrypt from 'bcryptjs';
import { verifyAuth } from '../../utils/verifyAuth'; // Import auth function

/**
 * This function updates an existing tour in AWS DynamoDB.
 * @param event - Contains the request body with tour details.
 * @returns Response with success message or error.
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

    // Parse body from API Gateway event
    const { userId, userName, password } = JSON.parse(event.body || '{}');

    console.log('Updating user with userId: ', userId, 'userName: ', userName, 'password: ', password);

    // Input validation
    if (!userId || !userName) {
      console.error('Invalid input: Missing required fields.', { userId, userName });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input:  userId, userName are required.', userId, userName }),
        headers: Config.headers,
      };
    }

    // Update the user item in DynamoDB
    let updateExpression = 'set updatedAt = :updatedAt , updatedBy = :updatedBy, userName = :userName';
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': new Date().toISOString(),
      ':updatedBy': user.userId, // Replace with actual user who is updating
      ':userName': userName,
    };

    // Add password to update expression if provided
    if (password) {
      const saltRounds = 10;
      const hashPassword = await bcrypt.hash(password, saltRounds);
      updateExpression += ', password = :password';
      expressionAttributeValues[':password'] = hashPassword;
    }
    await dynamoDB.update({
      TableName: Config.dbTables.USERS,
      Key: { userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues
    }).promise();

    console.log('user successfully updated: ', { userId, ...expressionAttributeValues });

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "User updated successfully",
        data: { userId, ...expressionAttributeValues },
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to update user: ', { error, event });

    // Return error response
    return {
      statusCode: error?.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
