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

  try {

    // Authenticate the user
    const authHeader = event.headers?.Authorization || '';
    console.log('Auth Header: ', authHeader);
    const user = await verifyAuth(authHeader);
    console.log('Authenticated User:', user);
    // Parse body from API Gateway event
    const {
      tourId,
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

    console.log('Updating tour with tourId: ', tourId, 'tourNumber: ', tourNumber, 'courseName: ', courseName, 'departureDate', departureDate, 'returnDate', returnDate);

    // Input validation
    if (!tourId || !tourNumber || !courseName || !departureDate || !returnDate) {
      console.error('Invalid input: Missing required fields.', { tourId, tourNumber, courseName, departureDate, returnDate });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: tourId, tourNumber, tourName, departureDate, returnDate are required.' }),
        headers: Config.headers,
      };
    }

    // Update the tour item in DynamoDB
    const updateExpression = `
      set tourNumber = :tourNumber,
      courseName =:courseName,
      planningAndSalesSignature=:planningAndSalesSignature,
      planningSalesOfficeTeamName=:planningSalesOfficeTeamName,
      departureDate=:departureDate,
      returnDate=:returnDate,
      nameOfCoursePersonInCharge=:nameOfCoursePersonInCharge,
      tourConductorName=:tourConductorName,
      numberOfReceiversInUse=:numberOfReceiversInUse,
      numberOfSendingDevices=:numberOfSendingDevices,
      subGuideFunctionAvailable=:subGuideFunctionAvailable,
      useTheTranslationFunction=:useTheTranslationFunction,
      coSponsoredCourseNumber=:coSponsoredCourseNumber,
      chatRestriction=:chatRestriction,
      updatedBy = :updatedBy,
      updatedAt = :updatedAt
    `;

    const expressionAttributeValues = {
      ':tourNumber': tourNumber,
      ':courseName':courseName,
      ':planningAndSalesSignature':planningAndSalesSignature,
      ':planningSalesOfficeTeamName':planningSalesOfficeTeamName,
      ':departureDate':departureDate,
      ':returnDate':returnDate,
      ':nameOfCoursePersonInCharge':nameOfCoursePersonInCharge,
      ':tourConductorName':tourConductorName,
      ':numberOfReceiversInUse':numberOfReceiversInUse,
      ':numberOfSendingDevices':numberOfSendingDevices,
      ':subGuideFunctionAvailable':subGuideFunctionAvailable,
      ':useTheTranslationFunction':useTheTranslationFunction,
      ':coSponsoredCourseNumber':coSponsoredCourseNumber,
      ':chatRestriction':chatRestriction,
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
