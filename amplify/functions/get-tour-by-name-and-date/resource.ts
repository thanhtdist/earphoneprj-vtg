import { defineFunction } from "@aws-amplify/backend";

/**
 * This function get a tour by name and date.
 */
export const getTourByNameAndDate = defineFunction({
  name: "get-tour-by-name-and-date", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});