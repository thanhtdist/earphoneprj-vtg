import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
import { verifyAuth } from '../../utils/verifyAuth'; // Import auth function

/**
 * This function retrieves a tour by tourId from AWS DynamoDB.
 * @param event - Contains the path parameters with tourId.
 * @returns Response with the tour details or error.
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

    // Get tourId from path parameters
    const tourId = event.pathParameters ? event.pathParameters.TourID : null;

    if (!tourId) {
      console.error('Invalid input: Missing tourId.');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: tourId is required.' }),
        headers: Config.headers,
      };
    }

    console.log('Retrieving tour with tourId: ', tourId);

    // Query DynamoDB for the tour with the specified tourId
    const result = await dynamoDB.get({
      TableName: Config.dbTables.TOURS,
      Key: { tourId },
    }).promise();

    if (!result.Item) {
      console.error('Tour not found: ', { tourId });
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Tour not found.' }),
        headers: Config.headers,
      };
    }

    console.log('Tour successfully retrieved: ', result.Item);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Tour retrieved successfully",
        data: result.Item,
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to retrieve tour: ', { error, event });

    // Return error response
    return {
      statusCode: error?.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
