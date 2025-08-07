import { defineFunction } from "@aws-amplify/backend";

/**
 * This function to upload files to S3 using a presigned URL.
 */
export const uploadPresignedS3Upload = defineFunction({
  name: "upload-presigned-s3-upload", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});