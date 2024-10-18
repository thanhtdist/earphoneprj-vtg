import { defineFunction } from "@aws-amplify/backend";

// Define the function to create an attendee
export const createAttendee = defineFunction({
  name: "create-attendee", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});