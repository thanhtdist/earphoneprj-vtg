import { defineFunction } from "@aws-amplify/backend";
    
export const sendChannelMessage = defineFunction({
  name: "send-channel-message",
  entry: "./handler.ts"
});