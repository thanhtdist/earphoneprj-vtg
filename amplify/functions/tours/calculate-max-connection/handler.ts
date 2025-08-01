import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Step 1: Scan tours with returnDate < today and isMaxConnectionProcessed = false
    const tours = await dynamoDB.scan({
      TableName: Config.dbTables.TOURS,
      FilterExpression: 'returnDate < :today AND isMaxConnectionProcessed = :false',
      ExpressionAttributeValues: {
        ':today': today,
        ':false': false,
      },
    }).promise();

    for (const tour of tours.Items || []) {
      const tourId = tour.tourId;

      // Step 2: Query connection history for tourId
      const connResult = await dynamoDB.query({
        TableName: Config.dbTables.CONNECTION_HISTORY,
        KeyConditionExpression: 'tourId = :tourId',
        ExpressionAttributeValues: {
          ':tourId': tourId,
        },
      }).promise();

      // Step 3: Calculate maxConnection
      const maxConnection = connResult.Items?.reduce((max, conn) => {
        return conn.connectionCount > max ? conn.connectionCount : max;
      }, 0) || 0;

      // Step 4: Update tour record
      await dynamoDB.update({
        TableName: Config.dbTables.TOURS,
        Key: { tourId },
        UpdateExpression: 'SET maxConnection = :max, isMaxConnectionProcessed = :true, updatedAt = :now',
        ExpressionAttributeValues: {
          ':max': maxConnection,
          ':true': true,
          ':now': new Date().toISOString(),
        },
      }).promise();

      console.log(`✅ Updated tour ${tourId} with maxConnection = ${maxConnection}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully processed tours',
        processedCount: tours.Items?.length || 0,
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('❌ Error calculating max connections:', error);
    return {
      statusCode: error?.statusCode || 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
