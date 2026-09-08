import { defineFunction } from "@aws-amplify/backend";

/**
 * This function update a tour by the admin.
 */
export const updateMeetingByTourId = defineFunction({
  name: "update-meeting-by-tourid", // Lamda function name is used to create in the cloud
  entry: "./handler.ts", // Path to the handler file to make business logic
  // Default is 3s. This handler now creates the tour's Chime meeting + channel + app instance
  // user server-side under a claim lock, and a losing caller polls the tour row for the winner's
  // result - both need well over 3s.
  timeoutSeconds: 30
});