import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';

/**
 * This function creates a new Chime channel membership when adding a member to a channel(group chat)
 * @param event - Contains Request Channel ARN, Member ARN, Type, and Chime Bearer
 * @returns Channel Membership Response if successful, error message if failed
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Create a new Chime SDK Message instance
  const cloudwatchlogs = new AWS.CloudWatchLogs();

  try {
    const logGroupName = 'YourLogGroupName';
    const logStreamName = 'YourLogStreamName';
    console.log('Send CloudWatch event: ', { event });
    const { logs } = JSON.parse(event.body || '{}');
    console.log('Send CloudWatch Logs: ', { logs });
    // const logEvents = [{
    //   message: "test cloud watch logs",
    //   timestamp: Date.now(),
    // }]

    const logEvents = logs.map((log: any, index: any) => ({
      message: log.message,
      timestamp: Date.now() + index,
  }));

  console.log('Send CloudWatch logEvents: ', { logEvents });

    await cloudwatchlogs.putLogEvents({
      logGroupName,
      logStreamName,
      logEvents,
    }).promise();

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Logs sent to CloudWatch' }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to Send CloudWatch Logs: ', { error, event });
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
