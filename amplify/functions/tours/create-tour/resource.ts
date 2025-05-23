import { defineFunction } from "@aws-amplify/backend";

/**
 * This function creates a tour by the admin.
 */
export const createTour = defineFunction({
  name: "create-tour", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});