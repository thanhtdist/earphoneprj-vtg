import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';

/**
 * Handles translation and speech synthesis via WebSocket
 */
export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const apiGatewayManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`
  });

  // Create service instances
  const translate = new AWS.Translate({ region: Config.region });
  const polly = new AWS.Polly({ region: Config.region });

  try {
    // Parse the WebSocket message body
    const body = JSON.parse(event.body || '{}');
    const { action, inputText, sourceLanguageCode, targetLanguageCode, engine } = body;

    // Validate if this is a translation message
    if (action !== 'sendMessage') {
      await sendToClient(apiGatewayManagementApi, connectionId, {
        type: 'error',
        message: 'Invalid action type'
      });
      return { statusCode: 400, body: 'Invalid action' };
    }

    // Send acknowledgment that processing has started
    await sendToClient(apiGatewayManagementApi, connectionId, {
      type: 'processing',
      message: 'Starting translation'
    });

    console.log('Translate Text with inputText: ', inputText, 'sourceLanguageCode: ',
      sourceLanguageCode, 'targetLanguageCode: ', targetLanguageCode, 'engine: ', engine);

    // Input validation
    if (!inputText || !sourceLanguageCode || !targetLanguageCode || !engine) {
      console.error('Invalid input: inputText, sourceLanguageCode, targetLanguageCode and engine are required.',
        { inputText, sourceLanguageCode, targetLanguageCode, engine });

      await sendToClient(apiGatewayManagementApi, connectionId, {
        type: 'error',
        message: 'Invalid input: inputText, sourceLanguageCode, targetLanguageCode and engine are required.'
      });

      return { statusCode: 400, body: 'Invalid input' };
    }

    // Perform translation
    const translateTextResponse = await translate.translateText({
      Text: inputText,
      SourceLanguageCode: sourceLanguageCode,
      TargetLanguageCode: targetLanguageCode
    }).promise();

    console.log('Translate Text Response: ', translateTextResponse);

    if (!translateTextResponse.TranslatedText) {
      console.error('Failed to translate text: ', translateTextResponse);

      await sendToClient(apiGatewayManagementApi, connectionId, {
        type: 'error',
        message: 'Failed to translate text'
      });

      return { statusCode: 500, body: 'Translation failed' };
    }

    // Send translation result to client
    await sendToClient(apiGatewayManagementApi, connectionId, {
      type: 'translationComplete',
      translatedText: translateTextResponse.TranslatedText
    });

    // Determine voice based on target language
    const voiceId = targetLanguageCode === 'ja-JP' ? 'Mizuki' :
      targetLanguageCode === 'en-US' ? 'Joanna' :
        targetLanguageCode === 'ko-KR' ? 'Seoyeon' :
          (targetLanguageCode === 'zh' || targetLanguageCode === 'zh-TW') ? 'Zhiyu' : 'Joanna';

    console.log('Translate VoiceId: ', voiceId);

    // Set up Polly parameters
    const params = {
      Engine: engine,
      ...(targetLanguageCode === 'zh' ? { LanguageCode: 'cmn-CN' } : {}),
      OutputFormat: 'mp3',
      Text: translateTextResponse.TranslatedText,
      VoiceId: voiceId
    };

    console.log('Synthesize Speech Params: ', params);
    const pollyResponse = await polly.synthesizeSpeech(params).promise();

    // Convert audio buffer to base64 for transmission over WebSocket
    const audioData = pollyResponse.AudioStream?.toString('base64');
    //const audioData = pollyResponse.AudioStream as Buffer;

    // // Send speech synthesis result to client
    await sendToClient(apiGatewayManagementApi, connectionId, {
      type: 'speechComplete',
      translatedText: translateTextResponse.TranslatedText,
      audioData: audioData
    });
    // Send binary audio data directly to the client
    //await sendBinaryToClient(apiGatewayManagementApi, connectionId, audioData);

    return { statusCode: 200, body: 'Message processed successfully' };
  } catch (error: any) {
    console.error('Failed to translate text to speech: ', { error, event });

    // Send error to client
    try {
      await sendToClient(apiGatewayManagementApi, connectionId, {
        type: 'error',
        message: error.message || 'Internal Server Error'
      });
    } catch (sendError) {
      console.error('Failed to send error to client:', sendError);
    }

    return { statusCode: 500, body: 'Error processing message' };
  }
};

/**
 * Helper function to send messages to connected WebSocket client
 */
async function sendToClient(apiGateway: AWS.ApiGatewayManagementApi, connectionId: string, message: any): Promise<void> {
  try {
    await apiGateway.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(message)
    }).promise();
  } catch (error: any) {
    // Handle if the connection is no longer available
    if (error.statusCode === 410) {
      console.log(`Connection ${connectionId} is no longer available`);
      // Could delete from connection table here if needed
    } if (error.statusCode === 413) {
      console.log(`Payload Too Large`);
      // Could delete from connection table here if needed
    } else {
      throw error;
    }
  }
}

/**
 * Helper function to send binary audio data to the client
 */
// async function sendBinaryToClient(apiGateway: AWS.ApiGatewayManagementApi, connectionId: string, audioStream: Buffer): Promise<void> {
//   try {
//     await apiGateway.postToConnection({
//       ConnectionId: connectionId,
//       Data: audioStream // binary data directly
//     }).promise();
//   } catch (error: any) {
//     if (error.statusCode === 410) {
//       console.log(`Connection ${connectionId} is no longer available`);
//     } else if (error.statusCode === 413) {
//       console.log(`Binary Payload Too Large`);
//     } else {
//       throw error;
//     }
//   }
// }