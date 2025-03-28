import { defineFunction } from "@aws-amplify/backend";

/**
 * This function list tours.
 */
export const activeAdmin = defineFunction({
  name: "active-admin", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});