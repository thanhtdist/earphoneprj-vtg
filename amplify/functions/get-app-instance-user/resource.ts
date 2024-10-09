import { defineFunction } from "@aws-amplify/backend";
    
export const getAppInstanceUser = defineFunction({
  name: "get-app-instance-user",
  entry: "./handler.ts"
});