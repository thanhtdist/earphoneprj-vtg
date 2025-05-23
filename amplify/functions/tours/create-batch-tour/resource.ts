import { defineFunction } from "@aws-amplify/backend";

/**
 * This function creates a tour by the admin.
 */
export const createBatchTour = defineFunction({
  name: "create-batch-tour", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});