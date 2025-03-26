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
  const query = event.queryStringParameters?.query ? decodeURIComponent(event.queryStringParameters.query.trim()) : undefined;

  // Calculate the ExclusiveStartKey based on the page number
  let ExclusiveStartKey;
  if (page > 1) {
    const previousPage = page - 1;
    const previousPageSize = previousPage * pageSize;
    const previousResult = await dynamoDB.scan({
      TableName: "Tours",
      Limit: previousPageSize,
      FilterExpression: "deleteFlag = :deleteFlag",
      ExpressionAttributeValues: {
        ":deleteFlag": 0,
      },
    }).promise();
    ExclusiveStartKey = previousResult.LastEvaluatedKey;
  }

  try {
    console.log('Retrieving list of tours');

    // Scan DynamoDB for Tours with pagination and search query
    let result;
    if (query) {
      result = await dynamoDB.scan({
        TableName: "Tours",
        Limit: pageSize,
        ExclusiveStartKey,
        FilterExpression: 'deleteFlag = :deleteFlag AND (contains(tourNumber, :query) OR contains(processingNumber, :query) OR contains(tourName, :query))',
        // ExpressionAttributeNames: {
        //   '#tourName': 'tourName',
        // },
        ExpressionAttributeValues: {
          ':deleteFlag': 0,
          ':query': query,
        },
      }).promise();
    } else {
      result = await dynamoDB.scan({
        TableName: "Tours",
        Limit: pageSize,
        ExclusiveStartKey,
        FilterExpression: "deleteFlag = :deleteFlag",
        ExpressionAttributeValues: {
          ":deleteFlag": 0,
        },
      }).promise();
    }

    // Additional call to get total tours
    const totalScan = await dynamoDB.scan({
      TableName: "Tours",
      Select: "COUNT",
      FilterExpression: "deleteFlag = :deleteFlag",
      ExpressionAttributeValues: {
        ":deleteFlag": 0,
      },
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
        data: {
          message: "Tours retrieved successfully",
          data: result.Items,
          count: totalScan.Count,
          lastEvaluatedKey: result.LastEvaluatedKey,
        }
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
