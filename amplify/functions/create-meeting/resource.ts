import { defineFunction } from "@aws-amplify/backend";
    
// Define the function to create a meeting
export const createMeeting = defineFunction({
  name: "create-meeting", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});