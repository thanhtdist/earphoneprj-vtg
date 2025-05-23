import { defineFunction } from "@aws-amplify/backend";

/**
 * This function lists all the attendees in the channel (group chat).
 */
export const listAttendee = defineFunction({
  name: "list-attendee", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});