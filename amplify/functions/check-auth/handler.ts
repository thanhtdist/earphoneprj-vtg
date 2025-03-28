import type { APIGatewayProxyHandler } from 'aws-lambda';
// import AWS from 'aws-sdk';
import { Config } from '../config';
// import bcrypt from 'bcryptjs';

/**
 * This function retrieves a user by email from AWS DynamoDB and verifies the password.
 * @param event - Contains the body with email and password.
 * @returns Response with login success or error.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const cookieHeader = event.headers.Cookie || "";
    console.log('Cookie Header: ', cookieHeader);
    // Check if the userInfo cookie is present  
    const userInfoCookie = cookieHeader.split("; ").find(row => row.startsWith("userInfo="));
    console.log('userInfoCookie: ', userInfoCookie);

    if (!userInfoCookie) {
      return { 
        statusCode: 401, 
        body: JSON.stringify({ message: "Unauthorized" }),
        headers: Config.headers,
      };
    }

    const userInfo = JSON.parse(decodeURIComponent(userInfoCookie.split("=")[1]));
    console.log('userInfo: ', userInfo);

    return {
      statusCode: 200,
      body: JSON.stringify({ user: userInfo }),
      headers: Config.headers,
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
