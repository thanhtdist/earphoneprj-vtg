import { defineFunction } from "@aws-amplify/backend";
import { LAMBDA_NODE_RUNTIME } from "../../../configs/runtime";

/**
 * This function gets the language the Guide of a tour speaks, from the Guide's WebSocket connection.
 */
export const getGuideLanguage = defineFunction({
  name: "get-guide-language", // Lamda function name is used to create in the cloud
  runtime: LAMBDA_NODE_RUNTIME, // Node.js version the function runs on
  entry: "./handler.ts" // Path to the handler file to make business logic
});
