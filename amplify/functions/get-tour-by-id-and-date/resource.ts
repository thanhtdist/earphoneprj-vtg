import { defineFunction } from "@aws-amplify/backend";

/**
 * This function get a tour by id and date.
 */
export const getTourByIdAndDate = defineFunction({
  name: "get-tour-by-id-and-date", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});