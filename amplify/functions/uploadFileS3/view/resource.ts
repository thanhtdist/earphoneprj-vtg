import { defineFunction, secret } from "@aws-amplify/backend";

/**
 * This function sends a message to a channel (chat group) by the participants.
 */
export const viewPresignedS3Upload = defineFunction({
  name: "view-presigned-s3-upload", // Lamda function name is used to create in the cloud
  entry: "./handler.ts", // Path to the handler file to make business logic
  environment: {
    // Environment variables that will be available during function execution
    PRIVATE_KEY: secret('PRIVATE_KEY'),
  }
});