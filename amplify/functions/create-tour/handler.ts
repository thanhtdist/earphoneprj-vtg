import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';
import { v4 as uuid } from 'uuid';

/**
 * This function creates a new tour and stores it in AWS DynamoDB.
 * @param event - Contains the request body with tour details.
 * @returns Response with success message or error.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Initialize DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

  try {
    // Parse body from API Gateway event
    const { 
      tourNumber, 
      tourName, 
      departureDate, 
      returnDate,
      processingNumber,
      acceptanceDate,
      planningOfficeName,
      planningSalesOfficeName,
      planningSalesOfficeTeamName,
      contactPersonName,
      contactPersonEmail,
      numberOfDevices,
      numberOfTransmitters,
      qrCodeDestination,
      emailCustomer,
      phoneNumberCustomer,
      otherRemarks,
      meetingId,
      channelId,
      chatRestriction
     } = JSON.parse(event.body || '{}');

    console.log('Creating tour with tourNumber: ', tourNumber, 'tourName: ', tourName);

    // Input validation
    if (!tourNumber || !tourName || !departureDate || !returnDate) {
      console.error('Invalid input: Missing required fields.', { tourNumber, tourName, departureDate, returnDate });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: tourNumber, tourName, departureDate, returnDate are required.' }),
        headers: Config.headers,
      };
    }

    // Create a new tour item for DynamoDB
    const tourItem = {
      tourId: uuid(), // Generate a unique tour ID
      tourNumber,
      tourName,
      departureDate,
      returnDate,
      processingNumber,
      acceptanceDate,
      planningOfficeName,
      planningSalesOfficeName,
      planningSalesOfficeTeamName,
      contactPersonName,
      contactPersonEmail,
      numberOfDevices,
      numberOfTransmitters,
      qrCodeDestination,
      emailCustomer,
      phoneNumberCustomer,
      otherRemarks,
      meetingId,
      channelId,
      chatRestriction: chatRestriction,
      createdAt: new Date().toISOString(),
      createdBy: 'admin',
      updatedAt: new Date().toISOString(),
      updatedBy: 'admin',
      deleteFlag: 0,
    };

    // Store the tour in DynamoDB
    await dynamoDB.put({
      TableName: "Tours",
      Item: tourItem,
    }).promise();

    console.log('Tour successfully created: ', tourItem);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Tour created successfully",
        data: tourItem,
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to create tour: ', { error, event });

    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
