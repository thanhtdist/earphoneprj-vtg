import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';

/**
 * This function updates an existing tour in AWS DynamoDB.
 * @param event - Contains the request body with tour details.
 * @returns Response with success message or error.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Initialize DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

  try {
    // Parse body from API Gateway event
    const {
      userId, email, password
    } = JSON.parse(event.body || '{}');

    console.log('Updating tour with userId: ', userId, 'email: ', email, 'password: ', password);

    // Input validation
    if (!userId || !email || !password) {
      console.error('Invalid input: Missing required fields.', { userId, email, password });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input:  userID,email, password are required.' }),
        headers: Config.headers,
      };
    }

    // Update the tour item in DynamoDB
    const updateExpression = `
      set ':email': email,
      ':password': password, 
    `;

    const expressionAttributeValues = {
      ':email': email,
      ':password': password,

    };

    await dynamoDB.update({
      TableName: "Users",
      Key: { userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    }).promise();

    console.log('Tour successfully updated: ', { userId, ...expressionAttributeValues });

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
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
