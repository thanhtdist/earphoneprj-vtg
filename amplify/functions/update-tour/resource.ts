import { defineFunction } from "@aws-amplify/backend";

/**
 * This function update a tour by the admin.
 */
export const updateTour = defineFunction({
  name: "update-tour", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});