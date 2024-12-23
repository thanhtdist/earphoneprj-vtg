import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '../config';

/**
 * This function creates a new Chime meeting when starting a live audio stream.
 * @param event - Contains Request Metting clientRequestToken and externalMeetingId
 * @returns Meeting Response if successful, error message if failed
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Create a new Chime SDK Meeting instance
  const translate = new AWS.Translate({ region: Config.region });
  const polly = new AWS.Polly({ region: Config.region });

  try {
    // Parse body from API Gateway event
    const { inputText, sourceLanguageCode, targetLanguageCode, engine } = JSON.parse(event.body || '{}');

    console.log('Translate Text with inputText: ', inputText, 'sourceLanguageCode: ',
      sourceLanguageCode, 'targetLanguageCode: ', targetLanguageCode, 'engine: ', engine);

    // Input validation
    if (!inputText || !sourceLanguageCode || !targetLanguageCode || !engine) {
      console.error('Invalid input: inputText, sourceLanguageCode, targetLanguageCode and engine are required.',
        { inputText, sourceLanguageCode, targetLanguageCode, engine });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: inputText, sourceLanguageCode, targetLanguageCode and engine are required.' }),
        headers: Config.headers,
      };
    }

    // Create a new Chime meeting
    const translateTextResponse = await translate.translateText({
      Text: inputText,
      SourceLanguageCode: sourceLanguageCode,
      TargetLanguageCode: targetLanguageCode
    }).promise();

    console.log('Translate Text Response: ', translateTextResponse);

    if (!translateTextResponse.TranslatedText) {
      console.error('Failed to translate text: ', translateTextResponse);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to translate text' }),
        headers: Config.headers,
      };
    }

    const pollyResponse = await polly.synthesizeSpeech({
      Engine: engine,
      OutputFormat: 'mp3',
      Text: translateTextResponse.TranslatedText,
      //VoiceId: 'Mizuki' // Mizuki for a female voice. Takumi for a male voice.
      VoiceId: targetLanguageCode === 'ja-JP' ? 'Mizuki' : targetLanguageCode === 'en-US' ? 'Joanna' : targetLanguageCode === 'ko-KR' ? 'Seoyeon' : targetLanguageCode === 'cmn-CN' ? 'Zhiyu' : targetLanguageCode === 'yue-CN' ? 'Hiujin' : 'Joanna'
    }).promise();

    // Return successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          translatedText: translateTextResponse.TranslatedText,
          speech: pollyResponse
        }
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to translate text to speech: ', { error, event });
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
