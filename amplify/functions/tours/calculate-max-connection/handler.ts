import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

// Helper function: get max connection stats for a tour (via reduce)
const getMaxConnectionStatsForTour = async (tourId: string): Promise<{
  maxConnection: number;
  maxGuide: number;
  maxSubGuide: number;
  maxUser: number;
}> => {
  const connResult = await dynamoDB.query({
    TableName: Config.dbTables.CONNECTION_HISTORY,
    IndexName: 'tourId-index',
    KeyConditionExpression: 'tourId = :tourId',
    ExpressionAttributeValues: {
      ':tourId': tourId,
    },
    ProjectionExpression: 'connectionCount, guideCount, subGuideCount, userCount',
  }).promise();

  const {
    maxConnection,
    maxGuide,
    maxSubGuide,
    maxUser,
  } = (connResult.Items || []).reduce(
    (acc, item) => ({
      maxConnection: Math.max(acc.maxConnection, item.connectionCount || 0),
      maxGuide: Math.max(acc.maxGuide, item.guideCount || 0),
      maxSubGuide: Math.max(acc.maxSubGuide, item.subGuideCount || 0),
      maxUser: Math.max(acc.maxUser, item.userCount || 0),
    }),
    {
      maxConnection: 0,
      maxGuide: 0,
      maxSubGuide: 0,
      maxUser: 0,
    }
  );

  return { maxConnection, maxGuide, maxSubGuide, maxUser };
};

export const handler: APIGatewayProxyHandler = async (_event) => {
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
    const results = await Promise.allSettled(
      tours.map(async (tour) => {
        const tourId = tour?.tourId;
        if (!tourId) {
          console.warn('⚠️ Skipped tour without tourId');
          return;
        }

        try {
          const {
            maxConnection,
            maxGuide,
            maxSubGuide,
            maxUser,
          } = await getMaxConnectionStatsForTour(tourId);


          // ✅ Store max stats in separate table
          await dynamoDB.put({
            TableName: Config.dbTables.TOUR_MAX_CONNECTIONS, // <-- NEW TABLE
            Item: {
              tourId,
              maxConnection,
              maxGuide,
              maxSubGuide,
              maxUser,
              updatedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
          }).promise();

          // ✅ Update only `isMaxConnectionProcessed` flag in TOURS table
          // await dynamoDB.update({
          //   TableName: Config.dbTables.TOURS,
          //   Key: { tourId },
          //   UpdateExpression: `
          //     SET maxConnection = :max,
          //         maxGuide = :guide,
          //         maxSubGuide = :sub,
          //         maxUser = :user,
          //         isMaxConnectionProcessed = :true,
          //         updatedAt = :now`,
          //   ExpressionAttributeValues: {
          //     ':max': maxConnection,
          //     ':guide': maxGuide,
          //     ':sub': maxSubGuide,
          //     ':user': maxUser,
          //     ':true': true,
          //     ':now': new Date().toISOString(),
          //   },
          // }).promise();
          await dynamoDB.update({
            TableName: Config.dbTables.TOURS,
            Key: { tourId },
            UpdateExpression: `
              SET isMaxConnectionProcessed = :true,
                  updatedAt = :now`,
            ExpressionAttributeValues: {
              ':true': true,
              ':now': new Date().toISOString(),
            },
          }).promise();

          console.log(`✅ Updated tour ${tourId}: max=${maxConnection}, guide=${maxGuide}, sub=${maxSubGuide}, user=${maxUser}`);
        } catch (err) {
          console.error(`❌ Failed to process tour ${tourId}:`, err);
          throw err;
        }
      })
    );

    const processedCount = results.filter((r) => r.status === 'fulfilled').length;

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
