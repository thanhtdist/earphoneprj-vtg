import { defineFunction } from "@aws-amplify/backend";
import { LAMBDA_NODE_RUNTIME } from "../../../configs/runtime";

/**
 * This function stops the transcription of a meeting, so that it can be started again with another language.
 */
export const stopMeetingTranscription = defineFunction({
  name: "stop-meeting-transcription", // Lamda function name is used to create in the cloud
  runtime: LAMBDA_NODE_RUNTIME, // Node.js version the function runs on
  entry: "./handler.ts" // Path to the handler file to make business logic
});
