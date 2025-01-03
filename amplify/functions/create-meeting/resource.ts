import { defineFunction } from "@aws-amplify/backend";

/**
 * This function creates a meeting for starting a live audio stream by the host.
 */
export const createMeeting = defineFunction({
  name: "create-meeting", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});