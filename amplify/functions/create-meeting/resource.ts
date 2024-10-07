import { defineFunction } from "@aws-amplify/backend";
    
export const createMeeting = defineFunction({
  name: "create-meeting",
  entry: "./handler.ts"
});