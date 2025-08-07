import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
import { updateConnectionHistoryAndBroadcast } from '../common/connectionUtils';

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;
    const body = JSON.parse(event.body || '{}');
    const { tourId, languageCode, userType } = body;

    if (!connectionId || !tourId || !languageCode || !userType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields.' }),
        headers: Config.headers,
      };
    }
    // 1. Save new connection
    await dynamoDB
      .put({
        TableName: Config.dbTables.WEBSOCKETCONNECTIONS,
        Item: {
          connectionId,
          languageCode,
          tourId,
          userType,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      })
      .promise();

    // 2. Update connection history and broadcast
    await updateConnectionHistoryAndBroadcast(
      tourId,
      languageCode,
      userType,
      event.requestContext.domainName,
      event.requestContext.stage
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Connected, stored, and notified successfully' }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('❌ Error during WebSocket connection:', { error, event });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};