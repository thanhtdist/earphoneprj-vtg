import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';

/**
 * Translates text only - no speech synthesis. Used by chat message translation (task #13).
 * `sourceLanguageCode` may be a fixed Amazon Translate code or "auto", in which case Translate
 * resolves the real source via Comprehend and echoes it back as `sourceLanguageCode` in the
 * response - callers use that to tag the message with its actual source instead of assuming it.
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  const translate = new AWS.Translate({ region: Config.region });

  try {
    // Parse body from API Gateway event
    const { inputText, sourceLanguageCode, targetLanguageCode } = JSON.parse(event.body || '{}');

    console.log('Translate Text with inputText: ', inputText, 'sourceLanguageCode: ',
      sourceLanguageCode, 'targetLanguageCode: ', targetLanguageCode);

    // Input validation
    if (!inputText || !sourceLanguageCode || !targetLanguageCode) {
      console.error('Invalid input: inputText, sourceLanguageCode and targetLanguageCode are required.',
        { inputText, sourceLanguageCode, targetLanguageCode });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input: inputText, sourceLanguageCode and targetLanguageCode are required.' }),
        headers: Config.headers,
      };
    }

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

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          translatedText: translateTextResponse.TranslatedText,
          sourceLanguageCode: translateTextResponse.SourceLanguageCode,
        },
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Failed to translate text: ', { error, event });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
