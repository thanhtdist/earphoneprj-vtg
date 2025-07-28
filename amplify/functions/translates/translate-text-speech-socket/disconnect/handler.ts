import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';

// Initialize DynamoDB client
const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

/**
 * WebSocket disconnect handler – cleans up stale connection entries from DynamoDB
 */
export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    // Delete the connection record from DynamoDB
    await dynamoDB.delete({
      TableName: Config.dbTables.WEBSOCKETCONNECTIONS,
      Key: { connectionId }
    }).promise();

    // Successfully disconnected
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Disconnected successfully' }),
      headers: Config.headers,
    };
  } catch (error: any) {
    // Log and return error message
    console.error('❌ Error during disconnect:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
