/**
 * Service to interact with AWS S3 Client from the frontend
 */
import Config from '../utils/config';
const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: Config.accessKeyId,
  secretAccessKey: Config.secretAccessKey,
  region: Config.region
});

const s3 = new AWS.S3();
// Uploads a file to S3
export const uploadFileToS3 = async (file) => {
  const params = {
    Bucket: Config.attachmentBucketName, // S3 bucket name
    Key: file.name, // File name to be stored in S3
    Body: file, // Content of the file
    ContentType: file.type // File type
  };

  try {
    const response = await s3.upload(params).promise();
    console.log('File uploaded successfully:', response);
    return response;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

