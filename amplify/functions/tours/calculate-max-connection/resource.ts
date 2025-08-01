import { defineFunction } from "@aws-amplify/backend";

/**
 * This function calcalate max connection for each tour.
 */
export const calculateMaxConnection = defineFunction({
  name: "calculate-max-connection", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});