import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';

// Connection management
const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });
const TABLE_NAME = process.env.CONNECTIONS_TABLE_NAME || 'websocketconnections';

/**
 * WebSocket connection handler – stores connection ID in DynamoDB (optional)
 */
export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  console.log('🔌 WebSocket connection event:', connectionId);

  try {
    // Uncomment below if you want to store connection in DynamoDB
    /*
    await dynamoDB.put({
      TableName: TABLE_NAME,
      Item: {
        connectionId,
        timestamp: Date.now(),
      },
    }).promise();
    */

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Connected successfully' }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('❌ Error during WebSocket connection:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
