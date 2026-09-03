import { defineFunction } from "@aws-amplify/backend";

/**
 * Text-only translation, no speech synthesis. Used by chat message translation (task #13).
 */
export const translateText = defineFunction({
  name: "translate-text", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});
