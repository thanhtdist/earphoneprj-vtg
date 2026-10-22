import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
import { findGuideLanguage } from '../../translates/translate-text-speech-socket/common/connectionUtils';

/**
 * This function gets the language the Guide of a tour speaks, as registered on the Guide's
 * WebSocket connection. A Guide device that joins later uses it to follow the Guide already there.
 * @param event - Contains the path parameters with tourId.
 * @returns Response with `{ guideLanguage }`, which is null while no Guide is connected.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Initialize DynamoDB client
  const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

  try {
    // Get tourId from path parameters
    const tourId = event.pathParameters ? event.pathParameters.TourID : null;

    if (!tourId) {
      console.error('Invalid input: Missing tourId.');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: tourId is required.' }),
        headers: Config.headers,
      };
    }

    const result = await dynamoDB.query({
      TableName: Config.dbTables.WEBSOCKETCONNECTIONS,
      IndexName: 'tourId-index',
      KeyConditionExpression: 'tourId = :tourId',
      ExpressionAttributeValues: { ':tourId': tourId },
    }).promise();

    const guideLanguage = findGuideLanguage(result.Items || []);
    console.log('Guide language of the tour: ', { tourId, guideLanguage });

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Guide language retrieved successfully',
        data: { guideLanguage },
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to retrieve the guide language: ', { error, event });

    return {
      statusCode: error?.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
