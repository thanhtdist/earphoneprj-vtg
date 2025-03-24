import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';
import { v4 as uuid } from 'uuid';
import { createAttendee } from '../create-attendee/resource';

/**
 * This function creates a new tour and stores it in AWS DynamoDB.
 * @param event - Contains the request body with tour details.
 * @returns Response with success message or error.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Initialize DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

  try {
    // Parse body from API Gateway event
    const {  userName,email, password} = JSON.parse(event.body || '{}');

    console.log('Creating user with userName: ', userName, 'password: ', password);

    // Input validation
    if (!userName || !email || !password) {
      console.error('Invalid input: Missing required fields.', { userName,email, password });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: All fields are required.',  }),
        headers: Config.headers,
      };
    }

    // Create a new tour item for DynamoDB
    const userItem = {
      userId: uuid(), // Generate a unique tour ID
      userName,
      password,
      email,
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
      deleteFlag: 0,
      role: 0
    };

    // Store the tour in DynamoDB
    await dynamoDB.put({
      TableName: "Users",
      Item: userItem,
    }).promise();

    console.log('User successfully created: ', userItem);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Tour created successfully",
        data: userItem,
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to create tour: ', { error, event });

    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
