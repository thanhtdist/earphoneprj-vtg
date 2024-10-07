import { defineFunction } from "@aws-amplify/backend";
    
export const createAttendee = defineFunction({
  name: "create-attendee",
  entry: "./handler.ts"
});