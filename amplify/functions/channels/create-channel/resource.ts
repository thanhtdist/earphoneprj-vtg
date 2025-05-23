import { defineFunction } from "@aws-amplify/backend";

/**
 * This function creates a channel (chat group) for chat by the host.
 */
export const createChannel = defineFunction({
  name: "create-channel", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});