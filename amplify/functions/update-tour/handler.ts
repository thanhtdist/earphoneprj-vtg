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
    // Parse body from API Gateway event
    const { 
      tourId,
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
      otherRemarks
     } = JSON.parse(event.body || '{}');

    console.log('Updating tour with tourId: ', tourId, 'tourNumber: ', tourNumber, 'tourName: ', tourName);

    // Input validation
    if (!tourId || !tourNumber || !tourName || !departureDate || !returnDate) {
      console.error('Invalid input: Missing required fields.', { tourId, tourNumber, tourName, departureDate, returnDate });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: tourId, tourNumber, tourName, departureDate, returnDate are required.' }),
        headers: Config.headers,
      };
    }

    // Update the tour item in DynamoDB
    const updateExpression = `
      set tourNumber = :tourNumber,
          tourName = :tourName,
          departureDate = :departureDate,
          returnDate = :returnDate,
          processingNumber = :processingNumber,
          acceptanceDate = :acceptanceDate,
          planningOfficeName = :planningOfficeName,
          planningSalesOfficeName = :planningSalesOfficeName,
          planningSalesOfficeTeamName = :planningSalesOfficeTeamName,
          contactPersonName = :contactPersonName,
          contactPersonEmail = :contactPersonEmail,
          numberOfDevices = :numberOfDevices,
          numberOfTransmitters = :numberOfTransmitters,
          qrCodeDestination = :qrCodeDestination,
          emailCustomer = :emailCustomer,
          phoneNumberCustomer = :phoneNumberCustomer,
          otherRemarks = :otherRemarks
    `;

    const expressionAttributeValues = {
      ':tourNumber': tourNumber,
      ':tourName': tourName,
      ':departureDate': departureDate,
      ':returnDate': returnDate,
      ':processingNumber': processingNumber,
      ':acceptanceDate': acceptanceDate,
      ':planningOfficeName': planningOfficeName,
      ':planningSalesOfficeName': planningSalesOfficeName,
      ':planningSalesOfficeTeamName': planningSalesOfficeTeamName,
      ':contactPersonName': contactPersonName,
      ':contactPersonEmail': contactPersonEmail,
      ':numberOfDevices': numberOfDevices,
      ':numberOfTransmitters': numberOfTransmitters,
      ':qrCodeDestination': qrCodeDestination,
      ':emailCustomer': emailCustomer,
      ':phoneNumberCustomer': phoneNumberCustomer,
      ':otherRemarks': otherRemarks
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
