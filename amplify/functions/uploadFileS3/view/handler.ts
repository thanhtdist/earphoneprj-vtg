import { APIGatewayProxyHandler } from 'aws-lambda';
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { Config } from '@configs/config';
import { secret } from '@aws-amplify/backend';

const CLOUDFRONT_DOMAIN = 'https://d8d9ccu87krcw.cloudfront.net'; // replace with yours
const KEY_PAIR_ID = 'KM5PK06K9XZUQ'; // replace with yours

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    //const { key } = JSON.parse(event.body || '{}');
    const fileKey = event.queryStringParameters?.key;
    if (!fileKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing "fileKey" in request body' }),
      };
    }
    const testPrivateKey = secret('PRIVATE_KEY');
    console.log("Test Private Key:", testPrivateKey);
    console.log("Private Key:", Config.privateKey);

    const url = `${CLOUDFRONT_DOMAIN}/${fileKey}`;
    const signedUrl = getSignedUrl({
      url,
      keyPairId: KEY_PAIR_ID,
      privateKey: Config.privateKey,
      dateLessThan: new Date(Date.now() + 1000 * 60 * 5), // 5 minutes
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          url: signedUrl
        },
        message: 'Successfully generated signed URL for viewing S3 file.',
      }
      ),
      headers: Config.headers,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error', details: (err as Error).message }),
      headers: Config.headers,
    };
  }
};
