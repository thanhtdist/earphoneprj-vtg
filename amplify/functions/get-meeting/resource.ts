import { defineFunction } from "@aws-amplify/backend";
    
export const getMeeting = defineFunction({
  name: "get-meeting",
  entry: "./handler.ts"
});