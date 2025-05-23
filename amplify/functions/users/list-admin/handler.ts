import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
import { verifyAuth } from '../../utils/verifyAuth'; // Import auth function

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

  console.log('Query Parameters:', { page, pageSize, query });
  // Calculate the ExclusiveStartKey based on the page number
  // let ExclusiveStartKey;
  // if (page > 1) {
  //   const previousPage = page - 1;
  //   const previousPageSize = previousPage * pageSize;
  //   const previousResult = await dynamoDB.scan({
  //     TableName: "Users",
  //     Limit: previousPageSize,
  //     FilterExpression: "deleteFlag = :deleteFlag",
  //     ExpressionAttributeValues: {
  //       ":deleteFlag": 0,
  //     },
  //   }).promise();
  //   ExclusiveStartKey = previousResult.LastEvaluatedKey;
  // }


  try {
    console.log('Retrieving list of tours');

    // Authenticate the user
    const authHeader = event.headers?.Authorization || '';
    console.log('Auth Header: ', authHeader);
    const user = await verifyAuth(authHeader);
    console.log('Authenticated User:', user);

    // Prepare DynamoDB scan parameters
    // let params: AWS.DynamoDB.DocumentClient.ScanInput = {
    //   TableName: "Users_test",
    //   FilterExpression: "deleteFlag = :deleteFlag",
    //   ExpressionAttributeValues: { ":deleteFlag": 0 },

    //   //Limit: pageSize,
    //   //ExclusiveStartKey: lastEvaluatedKey
    // };
    let params: AWS.DynamoDB.DocumentClient.QueryInput = {
      TableName: Config.dbTables.USERS,
      FilterExpression: "deleteFlag = :deleteFlag",
      KeyConditionExpression:"#userType = :userType",
      ExpressionAttributeValues: {":deleteFlag": 0, ":userType": "user"},
      IndexName: 'userType-createdAt-index',          
      ScanIndexForward: false,
      ProjectionExpression: "userId, userName, email, active, #role",
      ExpressionAttributeNames: {
        "#userType": "userType",
        "#role": "role"
      },
    };
    console.log('Scan Parameters: ', params);

    // Append search query filters if needed
    if (query) {
      params.FilterExpression +=
        " AND (contains(userName, :query))";
      params.ExpressionAttributeValues![":query"] = query;
    }

    console.log('Updated Scan Parameters: (if any)', params);
    // Run the scan to get all items matching your filters
    const scanResult = await dynamoDB.query(params).promise();
    const allItems = scanResult.Items || [];

    if (!allItems || allItems.length === 0) {
      console.error('No users found');
      return {
        statusCode: 200,
        body: JSON.stringify({
          data: {
            message: "No users found.",
            data: [],
            count: 0,
          }
        }),
        headers: Config.headers,
      };
    }

    // Now handle paging on the array of fetched items
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    // Slice out the current page
    const pageItems = allItems.slice(startIndex, endIndex);

    // Return the current page without calling DynamoDB again
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          message: "users retrieved successfully",
          data: pageItems,
          count: allItems.length
        }
      }),
      headers: Config.headers
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
