// uploadFileToS3.js
import Config from '../utils/config';
const AWS = require('aws-sdk');

AWS.config.update({
//   accessKeyId: 'YOUR_ACCESS_KEY_ID',
//   secretAccessKey: 'YOUR_SECRET_ACCESS_KEY',
  accessKeyId: Config.accessKeyId,
  secretAccessKey: Config.secretAccessKey,
  region: Config.region
});

const s3 = new AWS.S3();

export const uploadFileToS3 = async (file) => {
  const params = {
    Bucket: Config.attachmentBucketName,
    Key: file.name,
    Body: file,
    ContentType: file.type
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

// Define getFileS3 function to download file
export const getFileS3 = async (fileKey) => {
  const params = {
    Bucket: Config.attachmentBucketName,  // Replace with your bucket name
    Key: fileKey                 // The key (filename) of the file to retrieve
  };

  try {
    const data = await s3.getObject(params).promise();
    console.log('File retrieved successfully');
    return data.Body; // Returns the file data as a buffer
  } catch (error) {
    console.error('Error retrieving file:', error);
    throw error;
  }
};

export const generatePresignedUrl = async (objectKey, expiration = 60) => {
  try {
    const params = {
      Bucket:Config.attachmentBucketName,
      Key: objectKey,
      Expires: expiration, // Expiration in seconds (e.g., 60 = 1 minute)
    };
    const url = await s3.getSignedUrlPromise('getObject', params);
    return url;
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    throw error;
  }
};

