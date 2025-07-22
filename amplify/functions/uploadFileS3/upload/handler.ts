import type { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';
import { Config } from '@configs/config';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Initialize S3 client inside the function
    const s3 = new AWS.S3({
      region: Config.messageRegion,
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

    const allowedTypes = Config.allowedFileTypes;
    if (!allowedTypes.includes(fileType)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Unsupported file type.' }),
        headers: Config.headers,
      };
    }

    const key = `${Date.now()}-${fileName}`;
    const params = {
      Bucket: Config.attachmentBucketName,
      Key: key,
      Expires: Config.uploadPresignedS3Expiration,
      ContentType: fileType,
    };

    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          uploadUrl: uploadUrl,
          key: key,
        },
        message: 'Successfully generated signed URL for S3 upload.',
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
