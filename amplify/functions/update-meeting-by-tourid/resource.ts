import { defineFunction } from "@aws-amplify/backend";

/**
 * This function update a tour by the admin.
 */
export const updateMeetingByTourId = defineFunction({
  name: "update-meeting-by-tourid", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});