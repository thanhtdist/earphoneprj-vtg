import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
import { verifyAuth } from '../../utils/verifyAuth'; // Import auth function

/**
 * This function updates an existing User in AWS DynamoDB.
 * @param event - Contains the request body with User details.
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
    const { userId, active } = JSON.parse(event.body || '{}');


    console.log('Active User with userId: ', userId, active);

    // Input validation
    if (!userId) {
      console.error('Invalid input: Missing required fields.', { userId, active });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: userId, active are required.' }),
        headers: Config.headers,
      };
    }

    // Update the User item in DynamoDB
    const updateExpression = `
      set active = :active,
      updatedBy = :updatedBy,
      updatedAt = :updatedAt       
    `;

    const expressionAttributeValues = {
      ':active': active,
      ':updatedBy': user.userId, // Replace with actual user who is updating
      ':updatedAt': new Date().toISOString()

    };

    await dynamoDB.update({
      TableName: Config.dbTables.USERS,
      Key: { userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    }).promise();

    console.log('User successfully actived: ', { userId, ...expressionAttributeValues });

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "User active successfully",
        data: { userId, ...expressionAttributeValues },
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to active User: ', { error, event });

    // Return error response
    return {
      statusCode: error?.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
