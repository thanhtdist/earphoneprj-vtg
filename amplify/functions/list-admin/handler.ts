import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';
import { verifyAuth } from '../auth/verifyAuth'; // Import auth function

/**
 * This function retrieves a list of Users from AWS DynamoDB with pagination and search functionality.
 * @param event - Contains the request context.
 * @returns Response with the list of Users or error.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Initialize DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

  // Extract page, pageSize, and query from query parameters
  const page = parseInt(event.queryStringParameters?.page || '1', 10);
  const pageSize = parseInt(event.queryStringParameters?.pageSize || '10', 10);
  const query = event.queryStringParameters?.query ? decodeURIComponent(event.queryStringParameters.query.trim()) : undefined;

  // Calculate the ExclusiveStartKey based on the page number
  let ExclusiveStartKey;
  if (page > 1) {
    const previousPage = page - 1;
    const previousPageSize = previousPage * pageSize;
    const previousResult = await dynamoDB.scan({
      TableName: "Users",
      Limit: previousPageSize,
    }).promise();
    ExclusiveStartKey = previousResult.LastEvaluatedKey;
  }

  try {

    // Authenticate the user
    const authHeader = event.headers?.Authorization || '';
    console.log('Auth Header: ', authHeader);
    const user = await verifyAuth(authHeader);
    console.log('Authenticated User:', user);

    console.log('Retrieving list of Users');

    // Scan DynamoDB for Users with pagination and search query
    let result;
    if (query) {
      result = await dynamoDB.scan({
        TableName: "Users",
        Limit: pageSize,
        ExclusiveStartKey,
        FilterExpression: 'deleteFlag = :deleteFlag AND contains(#userName, :query)',
        ExpressionAttributeNames: {
          '#userName': 'userName',
        },
        ExpressionAttributeValues: {
          ':deleteFlag': 0,
          ':query': query,
        },
      }).promise();
    } else {
      result = await dynamoDB.scan({
        TableName: "Users",
        Limit: pageSize,
        ExclusiveStartKey,
        FilterExpression: "deleteFlag = :deleteFlag",
        ExpressionAttributeValues: {
          ":deleteFlag": 0,
        },
      }).promise();
    }


    if (!result.Items || result.Items.length === 0) {
      console.error('No Users found');
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'No Users found.' }),
        headers: Config.headers,
      };
    }

    console.log('Users successfully retrieved: ', result.Items);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Users retrieved successfully",
        data: result.Items,
        lastEvaluatedKey: result.LastEvaluatedKey,
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to retrieve Users: ', { error, event });

    // Return error response
    return {
      statusCode: error?.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
