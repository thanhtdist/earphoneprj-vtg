import { defineFunction } from "@aws-amplify/backend";

/**
 * This function get a tour.
 */
export const checkAuth = defineFunction({
  name: "check-auth", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});