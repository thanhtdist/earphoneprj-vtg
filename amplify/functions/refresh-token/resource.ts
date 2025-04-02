import { defineFunction } from "@aws-amplify/backend";

/**
 * This function refresh token.
 */
export const refreshToken = defineFunction({
  name: "refresh-token", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});