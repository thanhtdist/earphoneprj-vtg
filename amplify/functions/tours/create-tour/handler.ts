import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
import { v4 as uuid } from 'uuid';
import { verifyAuth } from '../../utils/verifyAuth'; // Import auth function
/**
 * This function creates a new tour and stores it in AWS DynamoDB.
 * @param event - Contains the request body with tour details.
 * @returns Response with success message or error.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Initialize DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

  try {
    // Authenticate the user
    const authHeader = event.headers?.Authorization || '';
    console.log('Auth Header: ', authHeader);
    const user = await verifyAuth(authHeader);
    console.log('Authenticated User:', user);

    // Parse body from API Gateway event
    const {
      // tourNumber,
      // tourName,
      // departureDate,
      // returnDate,
      // processingNumber,
      // acceptanceDate,
      // planningOfficeName,
      // planningSalesOfficeName,
      // planningSalesOfficeTeamName,
      // contactPersonName,
      // contactPersonEmail,
      // numberOfDevices,
      // numberOfTransmitters,
      // qrCodeDestination,
      // emailCustomer,
      // phoneNumberCustomer,
      // otherRemarks,
      // // meetingId,
      // // channelId,
      chatRestriction,
      tourNumber,
      courseName,
      planningAndSalesSignature,
      planningSalesOfficeTeamName,
      departureDate,
      returnDate,
      nameOfCoursePersonInCharge,
      tourConductorName,
      numberOfReceiversInUse,
      numberOfSendingDevices,
      subGuideFunctionAvailable,
      useTheTranslationFunction,
      coSponsoredCourseNumber
    } = JSON.parse(event.body || '{}');

    console.log('Creating tour with tourNumber: ', tourNumber, 'courseName: ', courseName, 'departureDate', departureDate, 'returnDate', returnDate);

    // Input validation
    if (!tourNumber || !courseName || !departureDate || !returnDate) {
      console.error('Invalid input: Missing required fields.', { tourNumber, courseName, departureDate, returnDate });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: tourNumber, tourName, departureDate, returnDate are required.' }),
        headers: Config.headers,
      };
    }
    console.log("123456789");

    // Create a new tour item for DynamoDB
    const tourItem = {
      tourId: uuid(), // Generate a unique tour ID
      tourNumber,
      courseName,
      planningAndSalesSignature,
      planningSalesOfficeTeamName,
      departureDate,
      returnDate,
      nameOfCoursePersonInCharge,
      tourConductorName,
      numberOfReceiversInUse,
      numberOfSendingDevices,
      subGuideFunctionAvailable,
      useTheTranslationFunction,
      coSponsoredCourseNumber,
      meetingId: '', // put empty when creating a new tour
      channelId: '', // put empty when creating a new tour
      chatRestriction: chatRestriction,
      createdAt: new Date().toISOString(),
      createdBy: user.userId,
      updatedAt: '',
      updatedBy: '',
      deleteFlag: 0,
      tourTestStatus: 'test', // Test and Production
      tourType: 'tour',
      isMaxConnectionProcessed: false, // default to false
    };

    // Store the tour in DynamoDB
    await dynamoDB.put({
      TableName: Config.dbTables.TOURS,
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
      statusCode: error?.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
