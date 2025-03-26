import { defineFunction } from "@aws-amplify/backend";

/**
 * This function delete(soft delete) a tour.
 */
export const deleteTour = defineFunction({
  name: "delete-tour", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});