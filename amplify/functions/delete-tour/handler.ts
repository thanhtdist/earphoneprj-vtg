import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';

/**
 * This function updates an existing tour in AWS DynamoDB.
 * @param event - Contains the request body with tour details.
 * @returns Response with success message or error.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Initialize DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

  try {
    // Get tourId from path parameters
    const tourId = event.pathParameters ? event.pathParameters.TourID : null;

    console.log('Updating tour with tourId: ', tourId);

    // Input validation
    if (!tourId) {
      console.error('Invalid input: Missing required fields.', { tourId });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: tourId is required.' }),
        headers: Config.headers,
      };
    }

    // Update the tour item in DynamoDB
    const updateExpression = 'set deleteFlag = :deleteFlag';
    const expressionAttributeValues = {
      ':deleteFlag': 1
    };

    await dynamoDB.update({
      TableName: "Tours",
      Key: { tourId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    }).promise();

    console.log('Tour successfully updated: ', { tourId, ...expressionAttributeValues });

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Tour updated successfully",
        data: { tourId, ...expressionAttributeValues },
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to update tour: ', { error, event });

    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
