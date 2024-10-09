import { defineFunction } from "@aws-amplify/backend";
    
export const addChannelMembership = defineFunction({
  name: "add-channel-membership",
  entry: "./handler.ts"
});