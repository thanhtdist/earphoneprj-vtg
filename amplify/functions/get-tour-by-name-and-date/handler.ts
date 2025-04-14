import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';
import { verifyAuth } from '../auth/verifyAuth'; // Import auth function

/**
 * This function retrieves a tour by tourName and departureDate from AWS DynamoDB.
 * @param event - Contains the query parameters with tourName and departureDate.
 * @returns Response with the tour details or error.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Initialize DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

  try {
    // Authenticate the user
    // const authHeader = event.headers?.Authorization || '';
    // console.log('Auth Header: ', authHeader);
    // const user = await verifyAuth(authHeader);
    // console.log('Authenticated User:', user);

    // Get tourName and departureDate from query parameters
    // const tourName = event.queryStringParameters?.tourName;
    // const departureDate = event.queryStringParameters?.departureDate;
    const { tourName, departureDate } = JSON.parse(event.body || '{}');

    if (!tourName || !departureDate) {
      console.error('Invalid input: Missing tourName or departureDate.');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: tourName and departureDate are required.' }),
        headers: Config.headers,
      };
    }

    console.log('Retrieving tour with tourName and departureDate: ', { tourName, departureDate });

    // Query DynamoDB for the tour with the specified tourName and departureDate
    const result = await dynamoDB.query({
      TableName: "Tours",
      IndexName: "tourName-departureDate-index", // Ensure you have a GSI for tourName and departureDate
      KeyConditionExpression: "#tourName = :tourName AND #departureDate = :departureDate",
      ExpressionAttributeNames: {
        "#tourName": "tourName",
        "#departureDate": "departureDate",
      },
      ExpressionAttributeValues: {
        ":tourName": tourName,
        ":departureDate": departureDate,
      },
    }).promise();

    if (!result.Items || result.Items.length === 0) {
      console.error('Tour not found: ', { tourName, departureDate });
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Tour not found.' }),
        headers: Config.headers,
      };
    }

    console.log('Tour successfully retrieved: ', result.Items);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Tour retrieved successfully",
        data: result.Items,
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
