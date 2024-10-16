import { defineBackend } from '@aws-amplify/backend';
import { Stack } from "aws-cdk-lib";
import {
  Cors,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { createMeeting } from './functions/create-meeting/resource';
import { getMeeting } from './functions/get-meeting/resource';
import { createAttendee } from './functions/create-attendee/resource';
import { createAppInstanceUser } from './functions/create-app-instance-user/resource';
import { createChannel } from './functions/create-channel/resource';
import { addChannelMembership } from './functions/add-channel-membership/resource';
import { sendChannelMessage } from './functions/send-channel-message/resource';

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  createMeeting,
  getMeeting,
  createAttendee,
  createAppInstanceUser,
  createChannel,
  addChannelMembership,
  sendChannelMessage,
});

// create a new API stack
const apiStack = backend.createStack("api-stack");

// create a new REST API
const meetingRestApi = new RestApi(apiStack, "MeetingVTGRestApi", {
  restApiName: "MeetingVTGRestApi",
  deploy: true,
  deployOptions: {
    stageName: "prod",
  },
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
meetingPath.addMethod("POST", createMeetingLambdaIntegration);

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

// Add app instance user API
const appInstanceUserRestApi = new RestApi(apiStack, "AppInstanceUserVTGRestApi", {
  restApiName: "AppInstanceUserVTGRestApi",
  deploy: true,
  deployOptions: {
    stageName: "prod",
  },
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS, // Restrict this to domains you trust
    allowMethods: Cors.ALL_METHODS, // Specify only the methods you need to allow
    allowHeaders: Cors.DEFAULT_HEADERS, // Specify only the headers you need to allow
  },
});

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
appInstanceUserPath.addMethod("POST", createAppInstanceUserVTGRestApiLambdaIntegration);

// Add channel API
const channelRestApi = new RestApi(apiStack, "ChannelVTGRestApi", {
  restApiName: "ChannelVTGRestApi",
  deploy: true,
  deployOptions: {
    stageName: "prod",
  },
  defaultCorsPreflightOptions: {
    allowOrigins: ['*'], // Restrict this to domains you trust
    allowMethods: ["GET", "POST", "OPTIONS"], // Specify only the methods you need to allow
    allowHeaders: ["*"], // Specify only the headers you need to allow
    //allowHeaders: ['Content-Type'],  
  },
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
channelPath.addMethod("POST", channelLambdaIntegration);

// create a dynamic {channelArn} resource under /channels
const channelArnPath = channelPath.addResource("{channelArn}");
//channelArnPath.addMethod("GET", getMeetingLambdaIntegration);

// create the 'memberships' resource under /channels/{channelArn}
const membershipsPath = channelArnPath.addResource("memberships");

// add POST method to /channels/{channelArn}/memberships with Lambda integration
membershipsPath.addMethod("POST", addChannelMembershipLambdaIntegration);

// create the 'attendees' resource under /channels/{channelArn}/messages
const sendMessagesPath = channelArnPath.addResource("messages");

// add POST method to /channels/{channelArn}/messages with Lambda integration
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