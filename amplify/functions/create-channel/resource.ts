import { defineFunction } from "@aws-amplify/backend";
    
export const createChannel = defineFunction({
  name: "create-channel",
  entry: "./handler.ts"
});