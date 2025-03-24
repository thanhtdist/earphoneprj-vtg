import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';

/**
 * This function retrieves a list of tours from AWS DynamoDB with pagination.
 * @param event - Contains the request context.
 * @returns Response with the list of tours or error.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Initialize DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

  // Extract page and pageSize from query parameters
  const page = parseInt(event.queryStringParameters?.page || '1', 10);
  const pageSize = parseInt(event.queryStringParameters?.pageSize || '10', 10);

  // Calculate the ExclusiveStartKey based on the page number
  let ExclusiveStartKey;
  if (page > 1) {
    const previousPage = page - 1;
    const previousPageSize = previousPage * pageSize;
    const previousResult = await dynamoDB.scan({
      TableName: "Tours",
      Limit: previousPageSize,
    }).promise();
    ExclusiveStartKey = previousResult.LastEvaluatedKey;
  }

  try {
    console.log('Retrieving list of tours');

    // Scan DynamoDB for tours with pagination
    const result = await dynamoDB.scan({
      TableName: "Tours",
      Limit: pageSize,
      ExclusiveStartKey,
    }).promise();

    if (!result.Items || result.Items.length === 0) {
      console.error('No tours found');
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No tours found.' }),
        headers: Config.headers,
      };
    }

    console.log('Tours successfully retrieved: ', result.Items);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Tours retrieved successfully",
        data: result.Items,
        lastEvaluatedKey: result.LastEvaluatedKey,
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to retrieve tours: ', { error, event });

    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
