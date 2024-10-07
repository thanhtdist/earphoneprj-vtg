import { defineBackend } from '@aws-amplify/backend';
import { Stack } from "aws-cdk-lib";
import {
  //AuthorizationType,
  //CognitoUserPoolsAuthorizer,
  Cors,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
//import { Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { auth } from './auth/resource';
// import { data } from './data/resource';
import { createMeeting } from './functions/create-meeting/resource';
import { getMeeting } from './functions/get-meeting/resource';
import { createAttendee } from './functions/create-attendee/resource';
//import { createMediaPipeline } from './functions/create-media-pipeline/resource';
//import { stopMediaPipeline } from './functions/stop-media-pipeline/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  // data,
  createMeeting,
  getMeeting,
  createAttendee,
  //createMediaPipeline,
  //stopMediaPipeline,
});

// create a new API stack
const apiStack = backend.createStack("api-stack");

// create a new REST API
const meetingRestApi = new RestApi(apiStack, "MeetingVTGRestApi", {
  restApiName: "MeetingVTGRestApi",
  deploy: true,
  deployOptions: {
    stageName: "dev",
  },
  // defaultCorsPreflightOptions: {
  //   allowOrigins: ['*'], // Restrict this to domains you trust
  //   allowMethods: ["POST", "OPTIONS"], // Specify only the methods you need to allow
  //   //allowHeaders: Cors.DEFAULT_HEADERS, // Specify only the headers you need to allow
  //   allowHeaders: ['Content-Type'],  
  // },
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS, // Restrict this to domains you trust
    allowMethods: Cors.ALL_METHODS, // Specify only the methods you need to allow
    allowHeaders: Cors.DEFAULT_HEADERS, // Specify only the headers you need to allow
  },
});

// create a new Lambda integration
const createMeetingLambdaIntegration = new LambdaIntegration(
  backend.createMeeting.resources.lambda
);
const getMeetingLambdaIntegration = new LambdaIntegration(
  backend.getMeeting.resources.lambda
);

// create a new resource path with IAM authorization
const meetingPath = meetingRestApi.root.addResource("meeting", {
  defaultMethodOptions: {
    //authorizationType: AuthorizationType.IAM,
  },
});

// add methods you would like to create to the resource path
meetingPath.addMethod("GET", getMeetingLambdaIntegration);
meetingPath.addMethod("POST", createMeetingLambdaIntegration);
//itemsPath.addMethod("DELETE", lambdaIntegration);
//itemsPath.addMethod("PUT", lambdaIntegration);

// add a proxy resource path to the API
// itemsPath.addProxy({
//   anyMethod: true,
//   defaultIntegration: lambdaIntegration,
// });

// create a new Cognito User Pools authorizer
// const cognitoAuth = new CognitoUserPoolsAuthorizer(apiStack, "CognitoAuth", {
//   cognitoUserPools: [backend.auth.resources.userPool],
// });

// create a new resource path with Cognito authorization
// const booksPath = myRestApi.root.addResource("cognito-auth-path");
// booksPath.addMethod("GET", lambdaIntegration, {
//   authorizationType: AuthorizationType.COGNITO,
//   authorizer: cognitoAuth,
// });

// create a new IAM policy to allow Invoke access to the API
// const apiRestPolicy = new Policy(apiStack, "RestApiPolicy", {
//   statements: [
//     new PolicyStatement({
//       actions: ["execute-api:Invoke"],
//       resources: [
//         `${myRestApi.arnForExecuteApi("*", "/items", "dev")}`,
//         `${myRestApi.arnForExecuteApi("*", "/items/*", "dev")}`,
//         `${myRestApi.arnForExecuteApi("*", "/cognito-auth-path", "dev")}`,
//       ],
//     }),
//   ],
// });

// attach the policy to the authenticated and unauthenticated IAM roles
// backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(
//   apiRestPolicy
// );
// backend.auth.resources.unauthenticatedUserIamRole.attachInlinePolicy(
//   apiRestPolicy
// );
// Add attendee API

const attendeeRestApi = new RestApi(apiStack, "AttendeeVTGRestApi", {
  restApiName: "AttendeeVTGRestApi",
  deploy: true,
  deployOptions: {
    stageName: "dev",
  },
  // defaultCorsPreflightOptions: {
  //   allowOrigins: ['*'], // Restrict this to domains you trust
  //   allowMethods: ["POST", "OPTIONS"], // Specify only the methods you need to allow
  //   //allowHeaders: Cors.DEFAULT_HEADERS, // Specify only the headers you need to allow
  //   allowHeaders: ['Content-Type'],  
  // },
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS, // Restrict this to domains you trust
    allowMethods: Cors.ALL_METHODS, // Specify only the methods you need to allow
    allowHeaders: Cors.DEFAULT_HEADERS, // Specify only the headers you need to allow
  },
});

// create a new Lambda integration
const attendeeLambdaIntegration = new LambdaIntegration(
  backend.createAttendee.resources.lambda
);

// create a new resource path with IAM authorization
const attendeePath = attendeeRestApi.root.addResource("attendee", {
  defaultMethodOptions: {
    //authorizationType: AuthorizationType.IAM,
  },
});

// add methods you would like to create to the resource path
//itemsPath.addMethod("GET", lambdaIntegration);
attendeePath.addMethod("POST", attendeeLambdaIntegration);
//itemsPath.addMethod("DELETE", lambdaIntegration);
//itemsPath.addMethod("PUT", lambdaIntegration);

// add outputs to the configuration file
backend.addOutput({
  custom: {
    API: {
      [meetingRestApi.restApiName]: {
        endpoint: meetingRestApi.url,
        region: Stack.of(meetingRestApi).region,
        apiName: meetingRestApi.restApiName,
      },
      [attendeeRestApi.restApiName]: {
        endpoint: attendeeRestApi.url,
        region: Stack.of(attendeeRestApi).region,
        apiName: attendeeRestApi.restApiName,
      },
    },
  },
});