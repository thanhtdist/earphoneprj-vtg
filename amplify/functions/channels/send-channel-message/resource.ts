import { defineFunction } from "@aws-amplify/backend";
import { LAMBDA_NODE_RUNTIME } from "../../../configs/runtime";

/**
 * This function sends a message to a channel (chat group) by the participants.
 */
export const sendChannelMessage = defineFunction({
  name: "send-channel-message", // Lamda function name is used to create in the cloud
  runtime: LAMBDA_NODE_RUNTIME, // Node.js version the function runs on
  entry: "./handler.ts" // Path to the handler file to make business logic
});