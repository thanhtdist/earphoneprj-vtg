import AWS from 'aws-sdk';
import { v4 as uuid } from 'uuid';
import { Config } from '@configs/config';

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });

export async function updateConnectionHistoryAndBroadcast(
  tourId: string,
  languageCode: string,
  userType: string,
  domainName: string,
  stage: string
) {
  const result = await dynamoDB
    .query({
      TableName: Config.dbTables.WEBSOCKETCONNECTIONS,
      IndexName: 'tourId-index',
      KeyConditionExpression: 'tourId = :tourId',
      ExpressionAttributeValues: {
        ':tourId': tourId,
      },
    })
    .promise();

  const connections = result.Items || [];
  const connectionCount = connections.length;
  const guideCount = connections.filter(c => c.userType === 'Guide').length;
  const subGuideCount = connections.filter(c => c.userType === 'Sub-Guide').length;
  const userCount = connections.filter(c => c.userType === 'User').length;

  await dynamoDB
    .put({
      TableName: Config.dbTables.CONNECTION_HISTORY,
      Item: {
        connectionHistoryId: uuid(),
        tourId,
        //languageCode,
        //userType,
        createdAt: new Date().toISOString(),
        connectionCount,
        guideCount,
        subGuideCount,
        userCount,
      },
    })
    .promise();

  const endpoint = `${domainName}/${stage}`;
  const apiGateway = new AWS.ApiGatewayManagementApi({ endpoint });

  const message = {
    type: 'connectionUpdate',
    tourId,
    connectionCount,
  };

  await Promise.all(
    connections.map(async (conn) => {
      try {
        await apiGateway
          .postToConnection({
            ConnectionId: conn.connectionId,
            Data: JSON.stringify(message),
          })
          .promise();
      } catch (err: any) {
        if (err.statusCode === 410) {
          console.warn(`🔌 Stale connection: ${conn.connectionId}`);
          await dynamoDB
            .delete({
              TableName: Config.dbTables.WEBSOCKETCONNECTIONS,
              Key: { connectionId: conn.connectionId },
            })
            .promise();
        } else {
          console.error(`❌ Failed to send to ${conn.connectionId}:`, err);
        }
      }
    })
  );
}
