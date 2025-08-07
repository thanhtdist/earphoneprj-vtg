import { defineFunction } from "@aws-amplify/backend";

/**
 * This function update connection history and broadcast.
 */
export const connectState = defineFunction({
  name: "connect-state", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});