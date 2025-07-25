import AWS from 'aws-sdk';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { Config } from '@configs/config';

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const body = JSON.parse(event.body || '{}');
  const { languageCode } = body;

  if (!languageCode) {
    return { statusCode: 400, body: 'Missing languageCode' };
  }

  await dynamoDB.put({
    TableName: Config.dbTables.WEBSOCKETCONNECTIONS,
    Item: {
      connectionId,
      languageCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  }).promise();

  return {
    statusCode: 200,
    body: 'Language set',
  };
};
