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
//import { auth } from './auth/resource';
// import { data } from './data/resource';
import { createMeeting } from './functions/create-meeting/resource';
import { getMeeting } from './functions/get-meeting/resource';
import { createAttendee } from './functions/create-attendee/resource';
import { getAppInstanceUser } from './functions/get-app-instance-user/resource';
import { createAppInstanceUser } from './functions/create-app-instance-user/resource';
import { createChannel } from './functions/create-channel/resource';
import { addChannelMembership } from './functions/add-channel-membership/resource';
import { sendChannelMessage } from './functions/send-channel-message/resource';
//import { createMediaPipeline } from './functions/create-media-pipeline/resource';
//import { stopMediaPipeline } from './functions/stop-media-pipeline/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  //auth,
  // data,
  createMeeting,
  getMeeting,
  createAttendee,
  getAppInstanceUser,
  createAppInstanceUser,
  createChannel,
  addChannelMembership,
  sendChannelMessage,
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
const meetingPath = meetingRestApi.root.addResource("meetings", {
  defaultMethodOptions: {
    //authorizationType: AuthorizationType.IAM,
  },
});

// add methods you would like to create to the resource path
//meetingPath.addMethod("GET", getMeetingLambdaIntegration);
meetingPath.addMethod("POST", createMeetingLambdaIntegration);
//itemsPath.addMethod("DELETE", lambdaIntegration);
//itemsPath.addMethod("PUT", lambdaIntegration);

// Add attendee API from meeting API
// create a new Lambda integration for creating attendees
const createAttendeeLambdaIntegration = new LambdaIntegration(
  backend.createAttendee.resources.lambda
);

// create a dynamic {MeetingID} resource under /meeting
const meetingIdPath = meetingPath.addResource("{MeetingID}");
meetingIdPath.addMethod("GET", getMeetingLambdaIntegration);

// create the 'attendees' resource under /meeting/{MeetingID}
const attendeesPath = meetingIdPath.addResource("attendees");

// add POST method to /meeting/{MeetingID}/attendees with Lambda integration
attendeesPath.addMethod("POST", createAttendeeLambdaIntegration);

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

// Add app instance user API
const appInstanceUserRestApi = new RestApi(apiStack, "AppInstanceUserVTGRestApi", {
  restApiName: "AppInstanceUserVTGRestApi",
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

// get the Lambda integration for the createAppInstanceUser function
const getAppInstanceUserVTGRestApiLambdaIntegration = new LambdaIntegration(
  backend.getAppInstanceUser.resources.lambda
);

// create a new Lambda integration
const createAppInstanceUserVTGRestApiLambdaIntegration = new LambdaIntegration(
  backend.createAppInstanceUser.resources.lambda
);

// create a new resource path with IAM authorization
const appInstanceUserPath = appInstanceUserRestApi.root.addResource("app-instance-users", {
  defaultMethodOptions: {
    //authorizationType: AuthorizationType.IAM,
  },
});

// add methods you would like to create to the resource path
//appInstanceUserPath.addMethod("GET", getAppInstanceUserVTGRestApiLambdaIntegration);
appInstanceUserPath.addMethod("POST", createAppInstanceUserVTGRestApiLambdaIntegration);


// create a dynamic {MeetingID} resource under /meeting
const appInstanceUserArnPath = appInstanceUserPath.addResource("{appInstanceUserArn}");
appInstanceUserArnPath.addMethod("GET", getAppInstanceUserVTGRestApiLambdaIntegration);


// Add channel API

const channelRestApi = new RestApi(apiStack, "ChannelVTGRestApi", {
  restApiName: "ChannelVTGRestApi",
  deploy: true,
  deployOptions: {
    stageName: "dev",
  },
  defaultCorsPreflightOptions: {
    allowOrigins: ['*'], // Restrict this to domains you trust
    allowMethods: ["GET", "POST", "OPTIONS"], // Specify only the methods you need to allow
    allowHeaders: ["*"], // Specify only the headers you need to allow
    //allowHeaders: ['Content-Type'],  
  },
  // defaultCorsPreflightOptions: {
  //   allowOrigins: Cors.ALL_ORIGINS, // Restrict this to domains you trust
  //   allowMethods: Cors.ALL_METHODS, // Specify only the methods you need to allow
  //   allowHeaders: Cors.DEFAULT_HEADERS, // Specify only the headers you need to allow
  // },
});

// create a new Lambda integration
const channelLambdaIntegration = new LambdaIntegration(
  backend.createChannel.resources.lambda
);

const addChannelMembershipLambdaIntegration = new LambdaIntegration(
  backend.addChannelMembership.resources.lambda
);

const sendChannelMessageLambdaIntegration = new LambdaIntegration(
  backend.sendChannelMessage.resources.lambda
);

// create a new resource path with IAM authorization
const channelPath = channelRestApi.root.addResource("channels", {
  defaultMethodOptions: {
    //authorizationType: AuthorizationType.IAM,
  },
});

// add methods you would like to create to the resource path
//itemsPath.addMethod("GET", lambdaIntegration);
channelPath.addMethod("POST", channelLambdaIntegration);
//itemsPath.addMethod("DELETE", lambdaIntegration);
//itemsPath.addMethod("PUT", lambdaIntegration);

// create a dynamic {MeetingID} resource under /meeting
const channelArnPath = channelPath.addResource("{channelArn}");
//channelArnPath.addMethod("GET", getMeetingLambdaIntegration);

// create the 'attendees' resource under /meeting/{MeetingID}
const membershipsPath = channelArnPath.addResource("memberships");

// add POST method to /meeting/{MeetingID}/attendees with Lambda integration
membershipsPath.addMethod("POST", addChannelMembershipLambdaIntegration);

// create the 'attendees' resource under /meeting/{MeetingID}
const sendMessagesPath = channelArnPath.addResource("messages");

// add POST method to /meeting/{MeetingID}/attendees with Lambda integration
sendMessagesPath.addMethod("POST", sendChannelMessageLambdaIntegration);

// add outputs to the configuration file
backend.addOutput({
  custom: {
    API: {
      [meetingRestApi.restApiName]: {
        endpoint: meetingRestApi.url,
        region: Stack.of(meetingRestApi).region,
        apiName: meetingRestApi.restApiName,
      },
      [appInstanceUserRestApi.restApiName]: {
        endpoint: appInstanceUserRestApi.url,
        region: Stack.of(appInstanceUserRestApi).region,
        apiName: appInstanceUserRestApi.restApiName,
      },
      [channelRestApi.restApiName]: {
        endpoint: channelRestApi.url,
        region: Stack.of(channelRestApi).region,
        apiName: channelRestApi.restApiName,
      },
    },
  },
});