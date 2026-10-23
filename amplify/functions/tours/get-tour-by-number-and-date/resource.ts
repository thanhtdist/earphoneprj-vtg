import { defineFunction } from "@aws-amplify/backend";
import { LAMBDA_NODE_RUNTIME } from "../../../configs/runtime";

/**
 * This function get a tour by tour number and depart date.
 */
export const getTourByNumberAndDate = defineFunction({
  name: "get-tour-by-number-and-date", // Lamda function name is used to create in the cloud
  runtime: LAMBDA_NODE_RUNTIME, // Node.js version the function runs on
  entry: "./handler.ts" // Path to the handler file to make business logic
});