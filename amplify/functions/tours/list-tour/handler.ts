import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
import { verifyAuth } from '../../utils/verifyAuth';

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
  const query = event.queryStringParameters?.query
    ? decodeURIComponent(event.queryStringParameters.query.trim())
    : undefined;

  // console.log('Page Size:', pageSize);
  // console.log('Last Evaluated Key:', lastEvaluatedKey);
  console.log('Query:', query);

  try {
    console.log('Retrieving list of tours');

    // Authenticate the user
    const authHeader = event.headers?.Authorization || '';
    console.log('Auth Header: ', authHeader);
    const user = await verifyAuth(authHeader);
    console.log('Authenticated User:', user);

    // Prepare DynamoDB scan parameters
    // let params: AWS.DynamoDB.DocumentClient.ScanInput = {
    //   TableName: "Tours",
    //   FilterExpression: "deleteFlag = :deleteFlag",
    //   ExpressionAttributeValues: { ":deleteFlag": 0 },
    //   //Limit: pageSize,
    //   //ExclusiveStartKey: lastEvaluatedKey
    // };
    let params: AWS.DynamoDB.DocumentClient.QueryInput = {
      TableName: Config.dbTables.TOURS,
      FilterExpression: "deleteFlag = :deleteFlag",
      KeyConditionExpression: "#tourType = :tourType",
      ExpressionAttributeValues: { ":deleteFlag": 0, ":tourType": "tour" },
      IndexName: 'tourType-createdAt-index',
      ScanIndexForward: false,
      ProjectionExpression: "tourId,chatRestriction,tourNumber,courseName,planningAndSalesSignature,planningSalesOfficeTeamName,departureDate,returnDate,nameOfCoursePersonInCharge,tourConductorName,numberOfReceiversInUse,numberOfSendingDevices,subGuideFunctionAvailable,useTheTranslationFunction,coSponsoredCourseNumber",
      ExpressionAttributeNames: {
        "#tourType": "tourType",
      },
    };
    console.log('Scan Parameters: ', params);

    // Append search query filters if needed
    if (query) {
      params.FilterExpression +=
        " AND (contains(tourNumber, :query) OR contains(courseName, :query))";
      params.ExpressionAttributeValues![":query"] = query;
    }

    console.log('Updated Scan Parameters: (if any)', params);
    // Run the scan to get all items matching your filters
    const scanResult = await dynamoDB.query(params).promise();
    const allItems = scanResult.Items || [];

    if (!allItems || allItems.length === 0) {
      console.error('No tours found');
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "No tours found.",
          data: {
            items: [],
            count: 0
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
        message: "Tours retrieved successfully",
        data: {
          items: pageItems,
          count: allItems.length
        }
      }),
      headers: Config.headers
    };
  } catch (error: any) {
    console.error('Failed to retrieve tours: ', { error, event });

    // Return error response
    return {
      statusCode: error?.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};