import { defineFunction } from "@aws-amplify/backend";

// Define the function to get a meeting
export const getMeeting = defineFunction({
  name: "get-meeting", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});