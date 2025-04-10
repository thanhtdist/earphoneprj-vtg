import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';
import { v4 as uuid } from 'uuid';
import { verifyAuth } from '../auth/verifyAuth'; // Import auth function

/**
 * This function creates new tours and stores them in AWS DynamoDB.
 * @param event - Contains the request body with an array of tour details.
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
    const tours = JSON.parse(event.body || '[]');

    if (!Array.isArray(tours) || tours.length === 0) {
      console.error('Invalid input: Body should be a non-empty array of tours.');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: Body should be a non-empty array of tours.' }),
        headers: Config.headers,
      };
    }

    const putRequests = tours.map(tour => {
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
        chatRestriction
      } = tour;

      // Input validation
      if (!tourNumber || !tourName || !departureDate || !returnDate) {
        throw new Error(`Invalid input: tourNumber, tourName, departureDate, returnDate are required for tour ${tourNumber}.`);
      }

      // Create a new tour item for DynamoDB
      return {
        PutRequest: {
          Item: {
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
            meetingId: '',
            channelId: '',
            chatRestriction,
            createdAt: new Date().toISOString(),
            createdBy: user.userId, // Replace with actual user who is creating
            updatedAt: '',
            updatedBy: '',
            deleteFlag: 0,
          }
        }
      };
    });

    // Batch write to DynamoDB
    const params = {
      RequestItems: {
        "Tours": putRequests
      }
    };

    await dynamoDB.batchWrite(params).promise();

    console.log('Tours successfully created: ', putRequests);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Tours created successfully",
        data: putRequests.map(req => req.PutRequest.Item),
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to create tours: ', { error, event });

    // Return error response
    return {
      statusCode: error?.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
