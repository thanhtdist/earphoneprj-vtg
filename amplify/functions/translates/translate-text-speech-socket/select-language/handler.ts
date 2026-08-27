import AWS from 'aws-sdk';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { Config } from '@configs/config';

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

/**
 * WebSocket handler for setting preferred language
 */
export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  try {
    const body = JSON.parse(event.body || '{}');
    const { languageCode } = body;

    if (!languageCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing languageCode' }),
      };
    }

    // update, not put - a put here would overwrite tourId/userType on the row, dropping this
    // connection out of the tourId-index the fan-out queries and out of the role counts
    await dynamoDB
      .update({
        TableName: Config.dbTables.WEBSOCKETCONNECTIONS,
        Key: { connectionId },
        UpdateExpression: 'SET languageCode = :languageCode, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':languageCode': languageCode,
          ':updatedAt': new Date().toISOString(),
        },
      })
      .promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Language set successfully' }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('❌ Error setting languageCode:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
