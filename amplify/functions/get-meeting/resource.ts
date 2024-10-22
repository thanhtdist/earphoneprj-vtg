import { defineFunction } from "@aws-amplify/backend";

/**
 * This function get a meeting to join a live audio stream by the participant.
 */
export const getMeeting = defineFunction({
  name: "get-meeting", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});