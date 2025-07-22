import { APIGatewayProxyHandler } from 'aws-lambda';
import { getSignedUrl } from "@aws-sdk/cloudfront-signer";
import { Config } from '@configs/config';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const fileKey = event.queryStringParameters?.key;
    if (!fileKey) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing "fileKey" in request body' }),
        headers: Config.headers,
      };
    }
    console.log("File Key:", fileKey);
    console.log("Private Key:", Config.privateKey);

    const url = `${Config.cloudFrontDomain}/${fileKey}`;
    console.log("URL:", url);
    const signedUrl = getSignedUrl({
      url,
      keyPairId: Config.cloudFrontKeyPairId,
      privateKey: Config.privateKey,
      dateLessThan: new Date(Date.now() + Config.viewPresignedS3UrlExpiration), // 5 minutes
    });
    console.log("signedUrl:", signedUrl);
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
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
