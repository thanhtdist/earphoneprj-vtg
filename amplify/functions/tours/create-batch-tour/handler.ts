import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
import { v4 as uuid } from 'uuid';
import { verifyAuth } from '../../utils/verifyAuth';
import dayjs from 'dayjs'; // For date parsing and formatting

// Accepts only 'yyyy-mm-dd' or 'yyyy/mm/dd' formats
const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return '';

  const validFormatRegex = /^\d{4}[-/]\d{2}[-/]\d{2}$/;
  if (!validFormatRegex.test(dateStr.trim())) {
    return ''; // Invalid format
  }

  const parsed = dayjs(dateStr.replace(/\//g, '-'));
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
};

export const handler: APIGatewayProxyHandler = async (event) => {
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

  try {
    const authHeader = event.headers?.Authorization || '';
    const user = await verifyAuth(authHeader);

    const tours = JSON.parse(event.body || '[]');

    if (!Array.isArray(tours) || tours.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: Body should be a non-empty array of tours.' }),
        headers: Config.headers,
      };
    }

    const putRequests = [];
    const errors: any[] = [];

    for (let i = 0; i < tours.length; i++) {
      const tour = tours[i];
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

      // Validate required fields
      if (!tourNumber || !courseName || !departureDate || !returnDate) {
        errors.push({
          index: i + 1,
          tourNumber,
          error: 'Missing required fields: tourNumber, courseName, departureDate, returnDate are required.'
        });
        continue;
      }

      const normalizedDeparture = normalizeDate(departureDate);
      const normalizedReturn = normalizeDate(returnDate);

      if (!normalizedDeparture || !normalizedReturn) {
        errors.push({
          index: i + 1,
          tourNumber,
          error: "Invalid date format. Only 'yyyy-mm-dd' or 'yyyy/mm/dd' are allowed."
        });
        continue;
      }

      // Construct item
      putRequests.push({
        PutRequest: {
          Item: {
            tourId: uuid(),
            tourNumber,
            courseName,
            planningAndSalesSignature,
            planningSalesOfficeTeamName,
            departureDate: normalizedDeparture,
            returnDate: normalizedReturn,
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
            createdBy: user.userId,
            updatedAt: '',
            updatedBy: '',
            deleteFlag: 0,
            tourTestStatus: 'test',
            tourType: 'tour'
          }
        }
      });
    }

    if (errors.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Some rows contain invalid data.',
          data: errors
        }),
        headers: Config.headers,
      };
    }

    // Batch write to DynamoDB
    const params = {
      RequestItems: {
        [Config.dbTables.TOURS]: putRequests
      }
    };

    await dynamoDB.batchWrite(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Tours created successfully',
        data: putRequests.map(req => req.PutRequest.Item),
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to create tours: ', { error, event });

    return {
      statusCode: error?.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
