import AWS from 'aws-sdk';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { Config } from '@configs/config';

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });
const translate = new AWS.Translate({ region: Config.region });
const polly = new AWS.Polly({ region: Config.region});

const languages = ['en-US', 'zh'];

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const body = JSON.parse(event.body || '{}');
  const { inputText, sourceLanguageCode } = body;

  console.log('Received inputText:', inputText);
  console.log('Received sourceLanguageCode:', sourceLanguageCode);

  if (!inputText || !sourceLanguageCode) {
    return { statusCode: 400, body: 'Missing inputText or sourceLanguageCode' };
  }

  // Get all WebSocket connections
  const connections = await dynamoDB.scan({ TableName: Config.dbTables.WEBSOCKETCONNECTIONS, }).promise();
  console.log('Connections:', connections);

  const apiGateway = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`,
  });

  for (const lang of languages) {
    console.log(`Translating to ${lang}...`);
    try {
      // Translate text từ JA → lang (en/zh)
      const translated = await translate.translateText({
        Text: inputText,
        SourceLanguageCode: sourceLanguageCode,
        TargetLanguageCode: lang,
      }).promise();

      console.log(`Translated text to ${lang}:`, translated.TranslatedText);

      const translatedText = translated.TranslatedText || '';
      //const voiceId = lang === 'zh' ? 'Zhiyu' : 'Joanna';
      const voiceId = lang === 'ja-JP' ? 'Mizuki' : lang === 'en-US' ? 'Joanna' : lang === 'ko-KR' ? 'Seoyeon' : (lang === 'zh' || lang === 'zh-TW') ? 'Zhiyu' : 'Joanna'
      console.log('Translate VoiceId: ', voiceId);

      // Synthesize speech using Polly
      let params = {
        Text: translatedText,
        OutputFormat: 'mp3',
        VoiceId: voiceId,
        Engine: 'standard', // or 'neural' based on your preference
        ...(lang === 'zh' ? { LanguageCode: 'cmn-CN' } : {}),
      }
      const speech = await polly.synthesizeSpeech(params).promise();
      console.log(`Generated speech for ${lang}:`, speech);

      if (!(speech.AudioStream instanceof Buffer)) {
        console.warn(`AudioStream is not a buffer for lang ${lang}`);
        continue;
      }

      // Find listeners for this language
      const listeners = (connections.Items || []).filter(conn => conn.languageCode === lang);
      console.log(`Found ${listeners.length} listeners for lang ${lang}`);

      for (const listener of listeners) {
        console.log(`Sending translation and audio to listener ${listener.connectionId} for lang ${lang}`);
        // 1. Send translation text
        await apiGateway.postToConnection({
          ConnectionId: listener.connectionId,
          Data: JSON.stringify({
            type: 'translation',
            language: lang,
            originalText: inputText,
            translatedText: translatedText,
          }),
        }).promise();

        // 2. Send audio stream
        await apiGateway.postToConnection({
          ConnectionId: listener.connectionId,
          Data: speech.AudioStream,
        }).promise();
      }
    } catch (error) {
      console.error(`Error translating/sending for lang=${lang}:`, error);
    }
  }

  return {
    statusCode: 200,
    body: 'Translated and audio sent to en/zh listeners',
  };
};
