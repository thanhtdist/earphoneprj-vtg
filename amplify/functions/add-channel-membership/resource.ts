import { defineFunction } from "@aws-amplify/backend";
   
// Define the function to add a member to a channel
export const addChannelMembership = defineFunction({
  name: "add-channel-membership", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});