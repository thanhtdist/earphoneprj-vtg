import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
import { v4 as uuid } from 'uuid';
import { verifyAuth } from '../../utils/verifyAuth';
import dayjs from 'dayjs';

const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const validFormatRegex = /^\d{4}[-/]\d{2}[-/]\d{2}$/;
  if (!validFormatRegex.test(dateStr.trim())) return '';
  const parsed = dayjs(dateStr.replace(/\//g, '-'));
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : '';
};

const validateTours = (tours: any[]): { errors: any[], validTours: any[] } => {
  const errors: any[] = [];
  const validTours: any[] = [];

  const seenKeys = new Set(); // for checking duplicate tourNumber + departureDate in the same batch

  for (let i = 0; i < tours.length; i++) {
    const tour = tours[i];
    const {
      tourNumber,
      courseName,
      departureDate,
      returnDate,
      useTheTranslationFunction,
      subGuideFunctionAvailable
    } = tour;

    if (!tourNumber || !courseName || !departureDate || !returnDate) {
      errors.push({
        index: i + 2,
        tourNumber,
        error: 'Missing required fields: tourNumber, courseName, departureDate, returnDate are required.'
      });
      continue;
    }

    const normalizedDeparture = normalizeDate(departureDate);
    const normalizedReturn = normalizeDate(returnDate);

    if (!normalizedDeparture || !normalizedReturn) {
      errors.push({
        index: i + 2,
        tourNumber,
        error: "Invalid date format. Only 'yyyy-mm-dd' or 'yyyy/mm/dd' are allowed."
      });
      continue;
    }

    // Check returnDate >= departureDate
    if (dayjs(normalizedReturn).isBefore(normalizedDeparture)) {
      errors.push({
        index: i + 2,
        tourNumber,
        error: 'ReturnDate must be equal to or after departureDate.'
      });
      continue;
    }

    // Check duplicate in batch
    const key = `${tourNumber}_${normalizedDeparture}`;
    if (seenKeys.has(key)) {
      errors.push({
        index: i + 2,
        tourNumber,
        error: 'Duplicate tourNumber and departureDate in input batch.'
      });
      continue;
    }

    seenKeys.add(key);

    // ✅ Validate useTheTranslationFunction only accepts 0 or 1
    if (
      useTheTranslationFunction !== undefined &&
      useTheTranslationFunction !== 0 &&
      useTheTranslationFunction !== 1 &&
      useTheTranslationFunction !== '0' &&
      useTheTranslationFunction !== '1'
    ) {
      errors.push({
        index: i + 2,
        tourNumber,
        error: 'Invalid value for useTheTranslationFunction. Only 0 or 1 allowed.'
      });
      continue;
    }

    // ✅ Validate subGuideFunctionAvailable only accepts 0 or 1
    if (
      subGuideFunctionAvailable !== undefined &&
      subGuideFunctionAvailable !== 0 &&
      subGuideFunctionAvailable !== 1 &&
      subGuideFunctionAvailable !== '0' &&
      subGuideFunctionAvailable !== '1'
    ) {
      errors.push({
        index: i + 2,
        tourNumber,
        error: 'Invalid value for subGuideFunctionAvailable. Only 0 or 1 allowed.'
      });
      continue;
    }

    validTours.push({
      ...tour,
      departureDate: normalizedDeparture,
      returnDate: normalizedReturn,
      useTheTranslationFunction: tour.useTheTranslationFunction === 1 || tour.useTheTranslationFunction === '1' ? true : false,
      subGuideFunctionAvailable: tour.subGuideFunctionAvailable === 1 || tour.subGuideFunctionAvailable === '1' ? true : false
    });
  }

  return { errors, validTours };
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

    const { errors, validTours } = validateTours(tours);

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

    // Check duplicate in DB: tourNumber + departureDate
    const existingErrors: any[] = [];
    const checkRequests = await Promise.all(validTours.map(async (tour, index) => {
      const result = await dynamoDB.query({
        TableName: Config.dbTables.TOURS,
        IndexName: 'tourNumber-departureDate-index', // make sure you create this index
        KeyConditionExpression: 'tourNumber = :tourNum AND departureDate = :depDate',
        ExpressionAttributeValues: {
          ':tourNum': tour.tourNumber,
          ':depDate': tour.departureDate
        },
        Limit: 1
      }).promise();

      if (result.Items && result.Items.length > 0) {
        existingErrors.push({
          index: index + 2,
          tourNumber: tour.tourNumber,
          error: 'TourNumber and departureDate already exist in database.'
        });
      }
    }));

    if (existingErrors.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Some rows already exist in DB.',
          data: existingErrors
        }),
        headers: Config.headers,
      };
    }

    const putRequests = validTours.map(tour => ({
      PutRequest: {
        Item: {
          tourId: uuid(),
          ...tour,
          meetingId: '',
          channelId: '',
          createdAt: new Date().toISOString(),
          createdBy: user.userId,
          updatedAt: '',
          updatedBy: '',
          deleteFlag: 0,
          tourTestStatus: 'test',
          tourType: 'tour',
          isMaxConnectionProcessed: false, // default to false
        }
      }
    }));

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
