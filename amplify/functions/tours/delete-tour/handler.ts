import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
import { verifyAuth } from '../../utils/verifyAuth'; // Import auth function

/**
 * This function updates an existing tour in AWS DynamoDB.
 * @param event - Contains the request body with tour details.
 * @returns Response with success message or error.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Initialize DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

  // Create a new Chime SDK Meeting instance
  const meetingChime = new AWS.ChimeSDKMeetings({ region: Config.region });

  try {

    // Authenticate the user
    const authHeader = event.headers?.Authorization || '';
    console.log('Auth Header: ', authHeader);
    const user = await verifyAuth(authHeader);
    console.log('Authenticated User:', user);

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

    // Get MeetingId for the tour with the specified tourId
    const result = await dynamoDB.get({
      TableName: Config.dbTables.TOURS,
      Key: { tourId },
    }).promise();
    console.log('Tour retrieved: ', result.Item?.meetingId);
    if(result.Item?.meetingId) {
      // Delete the meeting using the Chime SDK
      const meetingId = result.Item.meetingId;
      console.log('Deleting meeting with meetingId: ', meetingId);
      await meetingChime.deleteMeeting({ MeetingId: meetingId }).promise();
      console.log('Meeting deleted successfully: ', meetingId);
    }

    // Update the tour item in DynamoDB
    const updateExpression = `
      set deleteFlag = :deleteFlag,
      updatedBy = :updatedBy,
      updatedAt = :updatedAt   `;
    const expressionAttributeValues = {
      ':deleteFlag': 1,
      ':updatedBy': user.userId, // Replace with actual user who is updating
      ':updatedAt': new Date().toISOString()
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
