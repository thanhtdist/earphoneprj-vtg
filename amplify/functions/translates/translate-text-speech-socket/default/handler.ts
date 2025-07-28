import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { Config } from '@configs/config';

// Default WebSocket route handler for AWS API Gateway WebSocket API
export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  try {
    // Parse the incoming WebSocket message body
    const body = JSON.parse(event.body || '{}');
    const action = body.action;

    // Handle "ping" action sent from client to keep the connection alive
    if (action === 'ping') {
      console.log('✅ Received ping to keep connection alive');
      // No response sent back; just logging to avoid idle timeout
    } else {
      console.log('ℹ️ Unhandled action:', action);
    }

    // Always return 200 OK to acknowledge receipt of the message
    return { 
      statusCode: 200,
      body: JSON.stringify({ message: 'Received ping to keep connection alive' }),
      headers: Config.headers,
    };
  } catch (error: any) {
    // Log and return error if something goes wrong
    console.error('❌ Error in WebSocket default handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
