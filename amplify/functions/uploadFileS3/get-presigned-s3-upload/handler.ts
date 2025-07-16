import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Initialize S3 client inside the function
    const s3 = new AWS.S3({
      region: Config.region,
      signatureVersion: 'v4',
    });

    const { fileName, fileType } = JSON.parse(event.body || '{}');

    if (!fileName || !fileType) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'fileName and fileType are required.' }),
        headers: Config.headers,
      };
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    if (!allowedTypes.includes(fileType)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Unsupported file type.' }),
        headers: Config.headers,
      };
    }

    const key = `uploads/${Date.now()}-${fileName}`;
    const params = {
      Bucket: Config.attachmentBucketName,
      Key: key,
      Expires: 60 * 5,
      ContentType: fileType,
      ACL: 'public-read',
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

    return {
      statusCode: 200,
      body: JSON.stringify({
        uploadUrl,
        key,
        fileUrl: `https://${Config.attachmentBucketName}.s3.${Config.region}.amazonaws.com/${key}`,
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Error generating signed URL:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal Server Error' }),
      headers: Config.headers,
    };
  }
};
