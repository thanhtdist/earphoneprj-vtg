import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';

/**
 * This function updates an existing tour in AWS DynamoDB.
 * @param event - Contains the request body with tour details.
 * @returns Response with success message or error.
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
    const tourId = event.pathParameters ? event.pathParameters.TourID : null;
    // Parse body from API Gateway event
    const {
      meetingId,
      channelId

    } = JSON.parse(event.body || '{}');

    console.log('Updating tour with tourId: ', tourId, 'meetingId: ', meetingId, 'channelId: ', channelId);

    // Input validation
    if (!tourId || !meetingId || !channelId ) {
      console.error('Invalid input: Missing required fields.', { tourId, meetingId, channelId });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: tourId, tourNumber, tourName, departureDate, returnDate are required.' }),
        headers: Config.headers,
      };
    }

    // Update the tour item in DynamoDB
    const updateExpression = `
      set meetingId = :meetingId,
          channelId = :channelId
    `;

    const expressionAttributeValues = {
      ':meetingId': meetingId,
      ':channelId': channelId
    };

    await dynamoDB.update({
      TableName: Config.dbTables.TOURS,
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
      statusCode: error?.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
