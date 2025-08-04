import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';
import { updateConnectionHistoryAndBroadcast } from '../common/connectionUtils';

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId;

    if (!connectionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing connectionId.' }),
        headers: Config.headers,
      };
    }
    // Step 1: Get connection info before deleting
    const connection = await dynamoDB.get({
      TableName: Config.dbTables.WEBSOCKETCONNECTIONS,
      Key: { connectionId },
    }).promise();

    const item = connection.Item;

    if (!item) {
      console.warn(`⚠️ Connection ${connectionId} not found`);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Connection not found, nothing to do.' }),
        headers: Config.headers,
      };
    }

    const { tourId, languageCode, userType } = item;

    // Step 2: Delete the connection from table
    await dynamoDB.delete({
      TableName: Config.dbTables.WEBSOCKETCONNECTIONS,
      Key: { connectionId },
    }).promise();

    console.log(`✅ Disconnected and deleted connectionId: ${connectionId}`);

    // Step 3–4: Update history and broadcast
    await updateConnectionHistoryAndBroadcast(
      tourId,
      languageCode,
      userType,
      event.requestContext.domainName,
      event.requestContext.stage
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Disconnected and updated successfully.' }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('❌ Error in disconnect handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
