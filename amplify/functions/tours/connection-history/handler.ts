import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Parse input
    const {
      connectionId,
      tourId,
      createdAt,
      updatedAt,
      languageCode,
      userType,
    } = JSON.parse(event.body || '{}');

    if (!connectionId || !tourId || !languageCode || !userType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields.' }),
        headers: Config.headers,
      };
    }

    const timestamp = new Date().toISOString();

    // Step 1: Count current connections in websocketconnections table
    const scanParams = {
      TableName: Config.dbTables.WEBSOCKETCONNECTIONS,
      FilterExpression: '#tourId = :tourIdVal',
      ExpressionAttributeNames: {
        '#tourId': 'tourId',
      },
      ExpressionAttributeValues: {
        ':tourIdVal': tourId,
      },
    };

    const scanResult = await dynamoDB.scan(scanParams).promise();
    const currentConnectionCount = scanResult.Items?.length || 0;

    // Step 2: Store to connection-history
    const historyItem = {
      connectionId,
      tourId,
      createdAt: createdAt || timestamp,
      updatedAt: updatedAt || timestamp,
      languageCode,
      userType,
      connectionCount: currentConnectionCount,
    };

    await dynamoDB
      .put({
        TableName: Config.dbTables.CONNECTION_HISTORY,
        Item: historyItem,
      })
      .promise();

    console.log('Connection history stored:', historyItem);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Connection history stored successfully',
        data: historyItem,
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' }),
      headers: Config.headers,
    };
  }
};
