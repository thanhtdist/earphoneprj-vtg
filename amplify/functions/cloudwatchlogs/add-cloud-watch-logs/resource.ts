import { defineFunction } from "@aws-amplify/backend";

/**
 * This function adds a member to a channel when a participant joins a channel(group chat) to chat with others.
 */
export const addCloudWatchLogs = defineFunction({
  name: "add-cloud-watch-logs", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});