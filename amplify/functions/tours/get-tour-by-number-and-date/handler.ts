import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';

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
    const { tourNumber, departureDate } = JSON.parse(event.body || '{}');

    if (!tourNumber || !departureDate) {
      console.error('Invalid input: Missing tourNumber or departureDate.');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: tourNumber and departureDate are required.' }),
        headers: Config.headers,
      };
    }

    console.log('Retrieving tour with tourNumber and departureDate: ', { tourNumber, departureDate });

    // Query DynamoDB for the tour with the specified tourName and departureDate
    const result = await dynamoDB.query({
      TableName: Config.dbTables.TOURS,
      IndexName: "tourNumber-departureDate-index", // Ensure you have a GSI for tourName and departureDate
      KeyConditionExpression: "#tourNumber = :tourNumber AND #departureDate = :departureDate",
      FilterExpression: "#deleteFlag = :deleteFlag",
      ExpressionAttributeNames: {
        "#tourNumber": "tourNumber",
        "#departureDate": "departureDate",
        "#deleteFlag": "deleteFlag",
      },
      ExpressionAttributeValues: {
        ":tourNumber": tourNumber,
        ":departureDate": departureDate,
        ":deleteFlag": 0,
      },
    }).promise();

    if (!result.Items || result.Items.length === 0) {
      console.error('Tour not found: ', { tourNumber, departureDate });
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
