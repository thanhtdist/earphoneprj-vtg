import { defineFunction } from "@aws-amplify/backend";

/**
 * This function creates an app instance user for chat by the participants.
 */
export const createAppInstanceUser = defineFunction({
  name: "create-app-instance-user", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});