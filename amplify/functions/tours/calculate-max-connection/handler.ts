import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

// Helper function: get max connection for a tour
const getMaxConnectionForTour = async (tourId: string): Promise<number> => {
  const connResult = await dynamoDB.query({
    TableName: Config.dbTables.CONNECTION_HISTORY,
    IndexName: 'tourId-index',
    KeyConditionExpression: 'tourId = :tourId',
    ExpressionAttributeValues: {
      ':tourId': tourId,
    },
    ProjectionExpression: 'connectionCount',
  }).promise();

  return connResult.Items?.reduce((max, conn) => {
    return conn.connectionCount > max ? conn.connectionCount : max;
  }, 0) || 0;
};

export const handler: APIGatewayProxyHandler = async () => {
  console.time('ProcessingTours');

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    let tours: AWS.DynamoDB.DocumentClient.ItemList = [];
    let lastEvaluatedKey;

    // Step 1: Scan tours needing processing
    do {
      const result = await dynamoDB.scan({
        TableName: Config.dbTables.TOURS,
        FilterExpression: 'returnDate < :today AND isMaxConnectionProcessed = :false',
        ExpressionAttributeValues: {
          ':today': today,
          ':false': false,
        },
        ProjectionExpression: 'tourId',
        ExclusiveStartKey: lastEvaluatedKey,
      }).promise();

      tours = tours.concat(result.Items || []);
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    console.log(`🔍 Found ${tours.length} tours to process`);

    // Step 2: Process tours in parallel
    const results = await Promise.allSettled(tours.map(async (tour) => {
      const tourId = tour?.tourId;
      if (!tourId) {
        console.warn('⚠️ Skipped tour without tourId');
        return;
      }

      try {
        const maxConnection = await getMaxConnectionForTour(tourId);

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
      } catch (err) {
        console.error(`❌ Failed to process tour ${tourId}:`, err);
        throw err;
      }
    }));

    const processedCount = results.filter(r => r.status === 'fulfilled').length;

    console.timeEnd('ProcessingTours');

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully processed tours',
        processedCount,
        failedCount: results.length - processedCount,
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
