import { defineFunction } from "@aws-amplify/backend";

/**
 * This function create an attendee when a participant joins a meeting to listen to a live audio stream.
 */
export const createAttendee = defineFunction({
  name: "create-attendee", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});