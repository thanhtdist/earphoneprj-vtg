import { defineFunction } from "@aws-amplify/backend";

/**
 * This function calcalate max connection for each tour.
 */
export const storeConnectionHistory = defineFunction({
  name: "store-connection-history", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});