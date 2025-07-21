/**
 * Service to interact with AWS S3 Client from the frontend
 */
import Config from '../utils/config';
import { uploadPresignedUrl } from '../apis/api'; // Assuming this is the correct path to your API function
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


export const generatePresignedUrl = async (file) => {
  try {
    // Step 1: Request a pre-signed URL from your backend
    console.log('Generating presigned URL for file:', file);
    const getPresignedUrlResponse = await uploadPresignedUrl(file);
    const uploadUrl = getPresignedUrlResponse?.data?.uploadUrl;
    console.log('Received presigned URL:', uploadUrl);

    // Step 2: Upload the file directly to S3 using the pre-signed URL
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });

    // Step 3: Handle upload result
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    console.log('Upload successful!');
    return {
      key: getPresignedUrlResponse.data.key,
      fileUrl: getPresignedUrlResponse.data.fileUrl,
    };
  } catch (error) {
    // Step 4: Handle errors
    console.error('Upload error:', error);
  }
};

