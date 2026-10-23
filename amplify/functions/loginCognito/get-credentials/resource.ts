import { defineFunction, secret } from "@aws-amplify/backend";
import { LAMBDA_NODE_RUNTIME } from "../../../configs/runtime";

/**
 * This function sends a message to a channel (chat group) by the participants.
 */
export const loginAndGetCredentials = defineFunction({
  name: "login-and-get-credentials", // Lamda function name is used to create in the cloud
  runtime: LAMBDA_NODE_RUNTIME, // Node.js version the function runs on
  entry: "./handler.ts", // Path to the handler file to make business logic
  environment: {
    // Environment variables that will be available during function execution
    COGNITO_EMAIL: secret('COGNITO_EMAIL'),
    COGNITO_PASSWORD: secret('COGNITO_PASSWORD'),
  }
});