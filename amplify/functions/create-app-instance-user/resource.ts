import { defineFunction } from "@aws-amplify/backend";
    
export const createAppInstanceUser = defineFunction({
  name: "create-app-instance-user",
  entry: "./handler.ts"
});