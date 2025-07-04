import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
import { v4 as uuid } from 'uuid';
import { verifyAuth } from '../../utils/verifyAuth'; // Import auth function

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
    console.log('Before Tours to create:', event.body);
    const tours = JSON.parse(event.body || '[]');
    console.log('After Tours to create:', tours);

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
        chatRestriction
      } = tour;

      // Input validation
      if (!tourNumber || !courseName || !departureDate || !returnDate) {
        console.log('values input', 'tourNumber',tourNumber,'courseName',courseName,'departureDate',departureDate,'returnDate',returnDate )
        throw new Error(`Invalid input: tourNumber, courseName, departureDate, returnDate are required for tour ${tourNumber}.`);
      }
      console.log(123456789);
      
      // Create a new tour item for DynamoDB
      return {
        PutRequest: {
          Item: {
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
            meetingId: '',
            channelId: '',
            chatRestriction,
            createdAt: new Date().toISOString(),
            createdBy: user.userId, // Replace with actual user who is creating
            updatedAt: '',
            updatedBy: '',
            deleteFlag: 0,
            tourTestStatus: 'test', // Test and Production
            tourType: 'tour'
          }
        }
      };
    });

    // Batch write to DynamoDB
    const params = {
      RequestItems: {
        "tours_test": putRequests // Replace with your actual DynamoDB table name
      }
    };
    console.log('params',params);
    
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
