import AWS from 'aws-sdk';
import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { Config } from '@configs/config';
import jwt from 'jsonwebtoken';

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: Config.region });
const translate = new AWS.Translate({ region: Config.region });
const polly = new AWS.Polly({ region: Config.region });

// Languages Polly cannot voice - routed to Google Cloud TTS instead (see synthesizeGoogleSpeech).
// 'th' is Thai's normalized tag (getNormalizedLanguageCode, MultiLangAudio.js): Amazon Polly ships
// no th-TH voice in any region, but Amazon Translate and Google Cloud TTS both support Thai.
const GOOGLE_TTS_LANGUAGES: Record<string, { languageCode: string; name: string }> = {
  th: { languageCode: 'th-TH', name: 'th-TH-Standard-A' },
};

const getVoiceId = (lang: string): string => {
  switch (lang) {
    case 'ja-JP': return 'Mizuki';
    case 'en-US': return 'Joanna';
    case 'ko': return 'Seoyeon';
    case 'es': return 'Lucia';
    case 'fr': return 'Lea';
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

// --- Google Cloud TTS (for languages in GOOGLE_TTS_LANGUAGES, e.g. Thai) ---
//
// Auth, in order of preference (both wired in translate-audio/resource.ts via Amplify secret()):
//   1. GOOGLE_TTS_API_KEY                    - a Google API key, passed as ?key=. Simplest, for
//                                             quick testing. Used whenever it is set.
//   2. GOOGLE_APPLICATION_CREDENTIALS_JSON   - the service-account JSON as a single-line string;
//                                             signs a JWT and exchanges it for an OAuth2 token.
//                                             The path to use for anything long-lived.
// Switching between them is a resource.ts / secret change only - no code change here. Set the
// secrets per-branch with `npx ampx sandbox secret set <NAME>` (local) or the Amplify Console's
// Secrets page (deployed). Never commit either value.

interface GoogleCredentials {
  client_email: string;
  private_key: string;
}

let cachedGoogleAccessToken: { token: string; expiresAt: number } | null = null;

const getGoogleCredentials = (): GoogleCredentials => {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error(
      'Google TTS credentials not configured - set the GOOGLE_APPLICATION_CREDENTIALS_JSON secret.'
    );
  }
  return JSON.parse(credentialsJson);
};

const getGoogleAccessToken = async (): Promise<string> => {
  // Reused across invocations of a warm Lambda instance - tokens are valid for 1h, requests
  // arrive far more often than that
  if (cachedGoogleAccessToken && cachedGoogleAccessToken.expiresAt > Date.now()) {
    return cachedGoogleAccessToken.token;
  }

  const credentials = getGoogleCredentials();
  const now = Math.floor(Date.now() / 1000);
  const signedJwt = jwt.sign(
    {
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    },
    credentials.private_key,
    { algorithm: 'RS256' }
  );

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedJwt,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google OAuth2 token exchange failed: ${response.status} ${await response.text()}`);
  }
  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedGoogleAccessToken = {
    token: data.access_token,
    // Refresh a minute early so a cached token is never used right up to the edge of expiry
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return data.access_token;
};

const synthesizeGoogleSpeech = async (text: string, lang: string): Promise<Buffer> => {
  const voice = GOOGLE_TTS_LANGUAGES[lang];
  if (!voice) {
    throw new Error(`No Google Cloud TTS voice configured for language: ${lang}`);
  }

  const requestBody = JSON.stringify({
    input: { text },
    voice: { languageCode: voice.languageCode, name: voice.name },
    audioConfig: { audioEncoding: 'MP3' },
  });

  // Prefer the API key when set (quick testing); otherwise the service-account OAuth2 flow.
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  const response = apiKey
    ? await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      })
    : await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await getGoogleAccessToken()}`,
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });

  if (!response.ok) {
    throw new Error(`Google TTS API error ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { audioContent: string };
  return Buffer.from(data.audioContent, 'base64');
};

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const { inputText, sourceLanguageCode, tourId } = body;

    if (!inputText || !sourceLanguageCode || !tourId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'tourId, inputText and sourceLanguageCode are required.' }),
        headers: Config.headers,
      };
    }

    // const connections = await dynamoDB.scan({
    //   TableName: Config.dbTables.WEBSOCKETCONNECTIONS,
    // }).promise();
    // Query connections with the given tourId
    const connections = await dynamoDB.query({
      TableName: Config.dbTables.WEBSOCKETCONNECTIONS,
      IndexName: 'tourId-index', // Make sure this GSI exists
      KeyConditionExpression: 'tourId = :tourId',
      ExpressionAttributeValues: {
        ':tourId': tourId,
      },
    }).promise();

    const apiGateway = new AWS.ApiGatewayManagementApi({
      apiVersion: '2018-11-29',
      endpoint: `${event.requestContext.domainName}/${event.requestContext.stage}`,
    });

    // Derived from who is actually connected, instead of a fixed list - work stays
    // proportional to the audience as more languages are added. The source language is
    // excluded: translating it into itself is pure waste, and no listener plays it back
    // (ja-JP listeners use the live Chime meeting audio, not this channel - see selectedVoiceLanguage
    // === 'ja-JP' in MultiLangAudio.js)
    const languages = [...new Set(
      (connections.Items || [])
        .map(conn => conn.languageCode)
        .filter((lang): lang is string => Boolean(lang) && lang !== sourceLanguageCode)
    )];

    await Promise.all(languages.map(async (lang) => {
      try {
        const translated = await translate.translateText({
          Text: inputText,
          SourceLanguageCode: sourceLanguageCode,
          TargetLanguageCode: lang,
        }).promise();

        const translatedText = translated.TranslatedText || '';

        // Route TTS: Google Cloud for languages Polly cannot voice (Thai), Polly for the rest
        let audioBase64: string;
        if (lang in GOOGLE_TTS_LANGUAGES) {
          audioBase64 = (await synthesizeGoogleSpeech(translatedText, lang)).toString('base64');
        } else {
          const voiceId = getVoiceId(lang);
          const speechParams = getSpeechParams(translatedText, voiceId, lang);
          const speech = await polly.synthesizeSpeech(speechParams).promise();

          if (!speech.AudioStream || !(speech.AudioStream instanceof Buffer)) {
            console.warn(`❌ Invalid AudioStream for lang ${lang}`);
            return;
          }
          audioBase64 = speech.AudioStream.toString('base64');
        }

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
