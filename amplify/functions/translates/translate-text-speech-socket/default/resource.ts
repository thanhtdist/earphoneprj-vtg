import { defineFunction } from "@aws-amplify/backend";
import { LAMBDA_NODE_RUNTIME } from "../../../../configs/runtime";

/**
 * This function creates a meeting for starting a live audio stream by the host.
 */
export const defaultWS = defineFunction({
  name: "default", // Lamda function name is used to create in the cloud
  runtime: LAMBDA_NODE_RUNTIME, // Node.js version the function runs on
  entry: "./handler.ts" // Path to the handler file to make business logic
});