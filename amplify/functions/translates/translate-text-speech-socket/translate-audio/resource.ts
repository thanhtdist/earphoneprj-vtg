import { defineFunction, secret } from "@aws-amplify/backend";

/**
 * This function creates a meeting for starting a live audio stream by the host.
 */
export const translateAudio = defineFunction({
  name: "translate-audio", // Lamda function name is used to create in the cloud
  entry: "./handler.ts", // Path to the handler file to make business logic
  environment: {
    // Google Cloud TTS auth for languages Polly cannot voice (Thai). Two options - the handler
    // prefers GOOGLE_TTS_API_KEY when set, otherwise falls back to the service-account JSON.
    // Both are wired here, so BOTH secrets must exist at deploy time: while testing with only the
    // API key, set GOOGLE_APPLICATION_CREDENTIALS_JSON to a placeholder (e.g. {}).
    // secret() resolves per-branch and grants this function read access automatically - set each
    // with `npx ampx sandbox secret set <NAME>` locally, or the Amplify Console's per-branch Secrets.
    GOOGLE_TTS_API_KEY: secret('GOOGLE_TTS_API_KEY'),
    GOOGLE_APPLICATION_CREDENTIALS_JSON: secret('GOOGLE_APPLICATION_CREDENTIALS_JSON'),
  },
});