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
// import { listAppInstanceUser } from './functions/list-app-instance-user/resource';
import { addCloudWatchLogs } from './functions/add-cloud-watch-logs/resource';
import { startMeetingTranscription } from './functions/start-meeting-transcription/resource';
import { translateTextSpeech } from './functions/translate-text-speech/resource';
import { createTour } from './functions/create-tour/resource';
import { createUser } from './functions/create-user/resource';
import { getTour } from './functions/get-tour/resource';
import { listTour } from './functions/list-tour/resource';
import { updateTour } from './functions/update-tour/resource';
import { deleteTour } from './functions/delete-tour/resource';
import { login } from './functions/login/resource';
import { listAdmin } from './functions/list-admin/resource';
import { createBatchTour } from './functions/create-batch-tour/resource';
import { getAdmin } from './functions/get-admin/resource';
import { updateAdmin } from './functions/update-admin/resource';
import { deleteAdmin } from './functions/delete-admin/resource';
import { checkAuth } from './functions/check-auth/resource';
import { activeAdmin } from './functions/active-admin/resource';
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
  //listAppInstanceUser, // list app instance user for chat by the participants
  addCloudWatchLogs, // send logs to cloud watch
  startMeetingTranscription, // start meeting transcription
  translateTextSpeech, // translate text to speech
  createTour, // create tour by the admin
  createUser, // create user by the admin
  getTour, // get tour by tourID
  listTour, // list all tours
  updateTour, // update tour by the admin,
  login, //login admin
  listAdmin,
  createBatchTour,
  getAdmin, // create batch tour by the admin
  updateAdmin, // update admin by the admin
  deleteAdmin,  // delete admin by the admin
  deleteTour, // delete tour by the admin
  checkAuth, // check auth
  activeAdmin, // active admin by the admin
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

// add POST method to /meeting/{MeetingID}/transcription with startMeetingTranscription Lambda integration
meetingIdPath.addResource("transcription").addMethod("POST", new LambdaIntegration(
  backend.startMeetingTranscription.resources.lambda
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

// // add GET method to create /app-instance-users?appInstanceArn=appInstanceArn with listAppInstanceUser Lambda integration
// appInstanceUserPath.addMethod("GET", new LambdaIntegration(
//   backend.listAppInstanceUser.resources.lambda
// ));
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

// 2.1. Add app instance user API
const cloudWatchLogRestApi = new RestApi(apiStack, "CloudWatchLogRestApiVTGRestApi", {
  restApiName: "CloudWatchLogRestApiVTGRestApi",
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
const cloudWatchPath = cloudWatchLogRestApi.root.addResource("cloud-watch-logs");

// add POST method to create /app-instance-users with createAppInstanceUser Lambda integration
cloudWatchPath.addMethod("POST", new LambdaIntegration(
  backend.addCloudWatchLogs.resources.lambda
));

// =============2. API Getway, Lambda function for TRANSLATE ===============
// 2.1. Add app instance user API
const translateRestApi = new RestApi(apiStack, "TranslateVTGRestApi", {
  restApiName: "TranslateVTGRestApi",
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
const translatePath = translateRestApi.root.addResource("translate-text-speech");

// // add GET method to create /app-instance-users?appInstanceArn=appInstanceArn with listAppInstanceUser Lambda integration
// appInstanceUserPath.addMethod("GET", new LambdaIntegration(
//   backend.listAppInstanceUser.resources.lambda
// ));
// add POST method to create /app-instance-users with createAppInstanceUser Lambda integration
translatePath.addMethod("POST", new LambdaIntegration(
  backend.translateTextSpeech.resources.lambda
));

// =============33. API Getway, Lambda function for Tour ===============
// create a new REST API for audio voice
const tourRestApi = new RestApi(apiStack, "TourVTGRestApi", {
  restApiName: "TourVTGRestApi",
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

// create a new resource path(endpoint) for /tours
const tourPath = tourRestApi.root.addResource("tours");
// add POST method to create /tours with createTour Lambda integration
tourPath.addMethod("POST", new LambdaIntegration(
  backend.createTour.resources.lambda
));

// add GET method to /tours with listTour Lambda integration
tourPath.addMethod("GET", new LambdaIntegration(
  backend.listTour.resources.lambda
));

// add batch tour creation endpoint
const tourBatchPath = tourPath.addResource("batch");
// add POST method to create /tours/batch with createTour Lambda integration
tourBatchPath.addMethod("POST", new LambdaIntegration(
  backend.createBatchTour.resources.lambda
));

// create a dynamic {TourID} resource under /tours
const tourIdPath = tourPath.addResource("{TourID}");
// add GET method to /tours/{TourID} with getTour Lambda integration
tourIdPath.addMethod("GET", new LambdaIntegration(
  backend.getTour.resources.lambda
));

// add PUT method to /tours/{TourID} with updateTour Lambda integration
tourIdPath.addMethod("PUT", new LambdaIntegration(
  backend.updateTour.resources.lambda
));

//delete Tour with delete_flag = 1
const tourDeletePath = tourIdPath.addResource("delete");
tourDeletePath.addMethod("PUT", new LambdaIntegration(
  backend.deleteTour.resources.lambda
));


// create user api
const userRestApi = new RestApi(apiStack, "UserVTGRestApi", {
  restApiName: "UserVTGRestApi",
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

// create a new resource path(endpoint) for /users
const userPath = userRestApi.root.addResource("users");
// add POST method to create /users with createTour Lambda integration
userPath.addMethod("POST", new LambdaIntegration(
  backend.createUser.resources.lambda
));

const userAuthPath = userPath.addResource("auth");
// add GET method to /users/{login} with getUser Lambda integration
userAuthPath.addMethod("GET", new LambdaIntegration(
  backend.checkAuth.resources.lambda
));

// add GET method to login by email
// create a dynamic login resource under /users
const userLoginPath = userPath.addResource("login");
// add GET method to /users/{login} with getUser Lambda integration
userLoginPath.addMethod("POST", new LambdaIntegration(
  backend.login.resources.lambda
));

//get list admin
userPath.addMethod("GET", new LambdaIntegration(
  backend.listAdmin.resources.lambda
));

//update addmin
userPath.addMethod("PUT", new LambdaIntegration(
  backend.updateAdmin.resources.lambda
));


// add get detail admin
const userIdPath = userPath.addResource("{UserID}");
// add GET method to /users/{UserID} with getTour Lambda integration
userIdPath.addMethod("GET", new LambdaIntegration(
  backend.getAdmin.resources.lambda
));

//update addmin
const adminDeletePath = userIdPath.addResource("delete");
adminDeletePath.addMethod("PUT", new LambdaIntegration(
  backend.deleteAdmin.resources.lambda
));

//update addmin
const adminActivePath = userIdPath.addResource("active");
adminActivePath.addMethod("PUT", new LambdaIntegration(
  backend.activeAdmin.resources.lambda
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
      [cloudWatchLogRestApi.restApiName]: {
        endpoint: cloudWatchLogRestApi.url,
        region: Stack.of(cloudWatchLogRestApi).region,
        apiName: cloudWatchLogRestApi.restApiName,
      },
      [translateRestApi.restApiName]: {
        endpoint: translateRestApi.url,
        region: Stack.of(translateRestApi).region,
        apiName: translateRestApi.restApiName,
      },
      [tourRestApi.restApiName]: {
        endpoint: tourRestApi.url,
        region: Stack.of(tourRestApi).region,
        apiName: tourRestApi.restApiName,
      },
      [userRestApi.restApiName]: {
        endpoint: userRestApi.url,
        region: Stack.of(userRestApi).region,
        apiName: userRestApi.restApiName,
      },
    },
  },
});