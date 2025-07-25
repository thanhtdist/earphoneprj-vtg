import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';

// Connection management
const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });
const TABLE_NAME = process.env.CONNECTIONS_TABLE_NAME || 'websocketconnections';

/**
 * WebSocket connection handler - manages connections
 */
export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  console.log('WebSocket connection event:', event);

  try {
    // await dynamoDB.put({
    //   TableName: TABLE_NAME,
    //   Item: {
    //     connectionId,
    //     timestamp: Date.now()
    //   }
    // }).promise();

    return { statusCode: 200, body: 'Connected' };
  } catch (error) {
    console.error('Error connecting:', error);
    return { statusCode: 500, body: 'Failed to connect' };
  }
  // console.log("WebSocket connected:", event.requestContext.connectionId);
  // return {
  //   statusCode: 200,
  //   body: "Connected.",
  // };
};