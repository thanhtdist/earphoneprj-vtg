import { defineFunction } from "@aws-amplify/backend";
import { LAMBDA_NODE_RUNTIME } from "../../../configs/runtime";

/**
 * This function creates a channel (chat group) for chat by the host.
 */
export const createChannel = defineFunction({
  name: "create-channel", // Lamda function name is used to create in the cloud
  runtime: LAMBDA_NODE_RUNTIME, // Node.js version the function runs on
  entry: "./handler.ts" // Path to the handler file to make business logic
});