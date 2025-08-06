import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { verifyAuth } from '../../utils/verifyAuth'; // Import auth function

/**
 * This function creates a new user and stores it in AWS DynamoDB.
 * @param event - Contains the request body with user details.
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
    const { userName, email, password } = JSON.parse(event.body || '{}');

    console.log('Creating user with userName: ', userName, 'email:',email, 'password: ', password);

    // Input validation
    if (!userName || !email || !password) {
      console.error('Invalid input: Missing required fields.', { userName, email, password });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: All fields are required.', }),
        headers: Config.headers,
      };
    }

    // Generate a salt (optional, but recommended)
    const saltRounds = 10;
    const hashPassword = await bcrypt.hash(password, saltRounds);

    const params = {
      TableName: Config.dbTables.USERS,
      FilterExpression: '#email = :emailVal AND #deleteFlag = :deleteFlagVal',
      ExpressionAttributeNames: {
        '#email': 'email',
        '#deleteFlag': 'deleteFlag'
      },
      ExpressionAttributeValues: {
        ':emailVal': email,
        ':deleteFlagVal': 0
      }
    };
    const scanResult = await dynamoDB.scan(params).promise();
    console.log("scanResult", scanResult);

    if (scanResult.Count === 1) {
      console.log('no user');

      return {
       statusCode: 400,
        body: JSON.stringify({ error: 'Email already exists', }),
        headers: Config.headers,
      };
    }
    else {
      // Create a new user item for DynamoDB
      let userid = uuid();
      const userItem = {
        userId: userid, // Generate a unique user ID
        userName,
        password: hashPassword,
        email,
        createdAt: new Date().toISOString(),
        //createdBy: user.userId,
        createdBy: userid,
        updatedAt: '',
        updatedBy: '',
        deleteFlag: 0,
        role: 0,
        active: 0,
        userType: 'user'
      };

      // Store the user in DynamoDB
      await dynamoDB.put({
        TableName: Config.dbTables.USERS,
        Item: userItem,
      }).promise();

      console.log('User successfully created: ', userItem);

      // Return success response
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "User created successfully",
          data: userItem,
        }),
        headers: Config.headers,
      };
    }
  } catch (error: any) {
    console.error('Failed to create user: ', { error, event });

    // Return error response
    return {
      statusCode: error?.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};