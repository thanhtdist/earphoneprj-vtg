/**
 * This file is used to define the backend resources for the Amplify project.
 */
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
import { listChannelMembership } from './functions/list-channel-membership/resource';
import { listAttendee } from './functions/list-attendee/resource';
/**
 * Define the backend resources 
 * - List lambda functions for audio voice (metting session) and chat(message session)
 */
const backend = defineBackend({
  createMeeting, // create meeting for audio voice by the host
  getMeeting, // get meeting for audio voice by the participant
  createAttendee, // add participants to the meeting
  createAppInstanceUser, // create app instance user for chat by the participants
  createChannel, // create channel (chat group) for chat by the host
  addChannelMembership, // add participants to the channel (group chat)
  sendChannelMessage, // send message to the channel (group chat) by the participants
  listChannelMembership, // list all members in the channel (group chat)
  listAttendee, // list all attendees in the meeting
});

/**
* Create a new API stack that include all APIs for audio voice and chat
*/
const apiStack = backend.createStack("api-stack");

// =============1. API Getway, Lambda function for VOICE ===============
// create a new REST API for audio voice
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

// create a new resource path(endpoint) for /meetings
const meetingPath = meetingRestApi.root.addResource("meetings");
// add POST method to create /meeting with createMeeting Lambda integration
meetingPath.addMethod("POST", new LambdaIntegration(
  backend.createMeeting.resources.lambda
));

// create a dynamic {MeetingID} resource under /meeting
const meetingIdPath = meetingPath.addResource("{MeetingID}");
// add GET method to /meeting/{MeetingID} with getMeeting Lambda integration
meetingIdPath.addMethod("GET", new LambdaIntegration(
  backend.getMeeting.resources.lambda
));

// create the 'attendees' resource under /meeting/{MeetingID}/attendees
const attendeesPath = meetingIdPath.addResource("attendees");
// add POST method to /meeting/{MeetingID}/attendees with createAttendee Lambda integration
attendeesPath.addMethod("POST", new LambdaIntegration(
  backend.createAttendee.resources.lambda
));

// add GET method to /meeting/{MeetingID}/attendees with listAttendee Lambda integration
attendeesPath.addMethod("GET", new LambdaIntegration(
  backend.listAttendee.resources.lambda
));

// =============2. API Getway, Lambda function for CHAT ===============
// 2.1. Add app instance user API
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

// create a new resource path(endpoint) for /app-instance-users
const appInstanceUserPath = appInstanceUserRestApi.root.addResource("app-instance-users");

// add POST method to create /app-instance-users with createAppInstanceUser Lambda integration
appInstanceUserPath.addMethod("POST", new LambdaIntegration(
  backend.createAppInstanceUser.resources.lambda
));

// 2.2. Add channel API
const channelRestApi = new RestApi(apiStack, "ChannelVTGRestApi", {
  restApiName: "ChannelVTGRestApi",
  deploy: true,
  deployOptions: {
    stageName: "prod",
  },
  defaultCorsPreflightOptions: {
    allowOrigins: Cors.ALL_ORIGINS, // Restrict this to domains you trust
    allowMethods: Cors.ALL_METHODS, // Specify only the methods you need to allow
    // allowHeaders: Cors.DEFAULT_HEADERS, // Specify only the headers you need to allow
    allowHeaders: ['Content-Type', 'x-amz-chime-bearer'], // Specify only the headers you need to allow 
  },
});

// create a new resource path(endpoint) for /channels
const channelPath = channelRestApi.root.addResource("channels");

// add POST methods to create /channels with createChannel Lambda integration
channelPath.addMethod("POST", new LambdaIntegration(
  backend.createChannel.resources.lambda
));

// create a dynamic {channelArn} resource under /channels
const channelArnPath = channelPath.addResource("{channelArn}");

// create the 'memberships' resource under /channels/{channelArn}
const membershipsPath = channelArnPath.addResource("memberships");

// add POST method to /channels/{channelArn}/memberships with addChannelMembership Lambda integration
membershipsPath.addMethod("POST", new LambdaIntegration(
  backend.addChannelMembership.resources.lambda
));

// add GET method to /channels/{channelArn}/memberships with listChannelMembership Lambda integration
membershipsPath.addMethod("GET", new LambdaIntegration(
  backend.listChannelMembership.resources.lambda
));


// send the 'messages' resource under /channels/{channelArn}/messages
const sendMessagesPath = channelArnPath.addResource("messages");

// add POST method to /channels/{channelArn}/messages with sendChannelMessage Lambda integration
sendMessagesPath.addMethod("POST", new LambdaIntegration(
  backend.sendChannelMessage.resources.lambda
));

// add outputs to the configuration file for calling APIs metadata in the frontend
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