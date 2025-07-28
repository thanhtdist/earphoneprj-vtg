import AWS from 'aws-sdk';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { Config } from '@configs/config';

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });
const translate = new AWS.Translate({ region: Config.region });
const polly = new AWS.Polly({ region: Config.region });

const languages = ['en-US', 'zh'];

const getVoiceId = (lang: string): string => {
  switch (lang) {
    case 'ja-JP': return 'Mizuki';
    case 'en-US': return 'Joanna';
    case 'ko-KR': return 'Seoyeon';
    case 'zh':
    case 'zh-TW': return 'Zhiyu';
    default: return 'Joanna';
  }
};

const getSpeechParams = (text: string, voiceId: string, lang: string): AWS.Polly.SynthesizeSpeechInput => {
  const params: AWS.Polly.SynthesizeSpeechInput = {
    Engine: 'standard',
    OutputFormat: 'mp3',
    Text: text,
    VoiceId: voiceId,
  };
  if (lang === 'zh') {
    params.LanguageCode = 'cmn-CN';
  }
  return params;
};

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { inputText, sourceLanguageCode } = body;

    if (!inputText || !sourceLanguageCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'inputText and sourceLanguageCode are required.' }),
        headers: Config.headers,
      };
    }

    const connections = await dynamoDB.scan({
      TableName: Config.dbTables.WEBSOCKETCONNECTIONS,
    }).promise();

    const apiGateway = new AWS.ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`,
    });

    await Promise.all(languages.map(async (lang) => {
      try {
        const translated = await translate.translateText({
          Text: inputText,
          SourceLanguageCode: sourceLanguageCode,
          TargetLanguageCode: lang,
        }).promise();

        const translatedText = translated.TranslatedText || '';
        const voiceId = getVoiceId(lang);
        const speechParams = getSpeechParams(translatedText, voiceId, lang);
        const speech = await polly.synthesizeSpeech(speechParams).promise();

        if (!speech.AudioStream || !(speech.AudioStream instanceof Buffer)) {
          console.warn(`❌ Invalid AudioStream for lang ${lang}`);
          return;
        }

        const audioBase64 = speech.AudioStream.toString('base64');
        const listeners = (connections.Items || []).filter(conn => conn.languageCode === lang);

        await Promise.all(listeners.map(async (listener) => {
          await apiGateway.postToConnection({
            ConnectionId: listener.connectionId,
            Data: JSON.stringify({
              type: 'translationWithAudio',
              language: lang,
              originalText: inputText,
              translatedText,
              audioBase64,
            }),
          }).promise();
        }));
      } catch (err) {
        console.error(`❌ Error processing language: ${lang}`, err);
      }
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Translation and audio sent successfully.',
      }),
      headers: Config.headers,
    };

  } catch (error: any) {
    console.error('❌ WebSocket handler error:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
