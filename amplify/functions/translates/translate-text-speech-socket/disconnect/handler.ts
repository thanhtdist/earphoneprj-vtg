import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';

// Connection management
const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });
const TABLE_NAME = process.env.CONNECTIONS_TABLE_NAME || 'WebSocketConnections';

/**
 * WebSocket disconnect handler - cleans up connections
 */
export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  
  try {
    await dynamoDB.delete({
      TableName: TABLE_NAME,
      Key: { connectionId }
    }).promise();
    
    return { statusCode: 200, body: 'Disconnected' };
  } catch (error) {
    console.error('Error disconnecting:', error);
    return { statusCode: 500, body: 'Failed to disconnect' };
  }
};