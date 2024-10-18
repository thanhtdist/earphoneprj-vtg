import { defineFunction } from "@aws-amplify/backend";
  
// Define the function to send a channel message
export const sendChannelMessage = defineFunction({
  name: "send-channel-message", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});