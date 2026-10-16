import { defineFunction } from "@aws-amplify/backend";

/**
 * This function stops the transcription of a meeting, so that it can be started again with another language.
 */
export const stopMeetingTranscription = defineFunction({
  name: "stop-meeting-transcription", // Lamda function name is used to create in the cloud
  entry: "./handler.ts" // Path to the handler file to make business logic
});
