import { defineFunction } from "@aws-amplify/backend";
    
// Define the function to create an app instance user
export const createAppInstanceUser = defineFunction({
  name: "create-app-instance-user", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});