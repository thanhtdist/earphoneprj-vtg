import { defineFunction } from "@aws-amplify/backend";

/**
 * This function sends a message to a channel (chat group) by the participants.
 */
export const sendChannelMessage = defineFunction({
  name: "send-channel-message", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});