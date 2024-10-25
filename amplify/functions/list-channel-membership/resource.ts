import { defineFunction } from "@aws-amplify/backend";

/**
 * This function lists all the members in the channel (group chat).
 */
export const listChannelMembership = defineFunction({
  name: "list-channel-membership", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});