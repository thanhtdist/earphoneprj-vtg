/**
 * This file is used to define the backend resources for the Amplify project.
 */
import { defineBackend } from '@aws-amplify/backend';
import { Stack } from "aws-cdk-lib";
import {
  Cors,
  LambdaIntegration,
  RestApi
} from "aws-cdk-lib/aws-apigateway";
import { WebSocketApi, WebSocketStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

import { createMeeting } from './functions/meetings/create-meeting/resource';
import { getMeeting } from './functions/meetings/get-meeting/resource';
import { createAttendee } from './functions/meetings/create-attendee/resource';
import { createAppInstanceUser } from './functions/channels/create-app-instance-user/resource';
import { createChannel } from './functions/channels/create-channel/resource';
import { addChannelMembership } from './functions/channels/add-channel-membership/resource';
import { sendChannelMessage } from './functions/channels/send-channel-message/resource';
import { listChannelMembership } from './functions/channels/list-channel-membership/resource';
import { listAttendee } from './functions/meetings/list-attendee/resource';
// import { listAppInstanceUser } from './functions/list-app-instance-user/resource';
import { addCloudWatchLogs } from './functions/cloudwatchlogs/add-cloud-watch-logs/resource';
import { startMeetingTranscription } from './functions/meetings/start-meeting-transcription/resource';
import { translateTextSpeech } from './functions/translates/translate-text-speech/resource';
import { createTour } from './functions/tours/create-tour/resource';
import { createAdmin } from './functions/users/create-admin/resource';
import { getTour } from './functions/tours/get-tour/resource';
import { listTour } from './functions/tours/list-tour/resource';
import { updateTour } from './functions/tours/update-tour/resource';
import { deleteTour } from './functions/tours/delete-tour/resource';
import { calculateMaxConnection } from './functions/tours/calculate-max-connection/resource';
import { login } from './functions/users/login/resource';
import { listAdmin } from './functions/users/list-admin/resource';
import { createBatchTour } from './functions/tours/create-batch-tour/resource';
import { getAdmin } from './functions/users/get-admin/resource';
import { updateAdmin } from './functions/users/update-admin/resource';
import { deleteAdmin } from './functions/users/delete-admin/resource';
import { checkAuth } from './functions/users/check-auth/resource';
import { activeAdmin } from './functions/users/active-admin/resource';
import { refreshToken } from './functions/users/refresh-token/resource';
import { getMeetingByTourId } from './functions/tours/get-meeting-by-tourid/resource';
import { getTourByNumberAndDate } from './functions/tours/get-tour-by-number-and-date/resource';
import { updateMeetingByTourId } from './functions/tours/update-meeting-by-tourid/resource';
import { defaultWS } from './functions/translates/translate-text-speech-socket/default/resource';
import { connect } from './functions/translates/translate-text-speech-socket/connect/resource';
import { disconnect } from './functions/translates/translate-text-speech-socket/disconnect/resource';
import { selectLanguage } from './functions/translates/translate-text-speech-socket/select-language/resource';
import { translateAudio } from './functions/translates/translate-text-speech-socket/translate-audio/resource';
import { connectState } from './functions/translates/translate-text-speech-socket/connect-state/resource';
import { uploadPresignedS3Upload } from './functions/uploadFileS3/upload/resource';
import { viewPresignedS3Upload } from './functions/uploadFileS3/view/resource';
import { loginAndGetCredentials } from './functions/loginCognito/get-credentials/resource';

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
  getTour, // get tour by tourID
  listTour, // list all tours
  updateTour, // update tour by the admin,
  login, //login admin
  listAdmin,
  createBatchTour,
  calculateMaxConnection, // calculate max connection for each tour
  getAdmin, // create batch tour by the admin
  createAdmin, // create user by the admin
  updateAdmin, // update admin by the admin
  deleteAdmin,  // delete admin by the admin
  deleteTour, // delete tour by the admin
  checkAuth, // check auth
  activeAdmin, // active admin by the admin
  refreshToken, // refresh token by the admin
  getMeetingByTourId, // get meeting by tourID
  updateMeetingByTourId,
  getTourByNumberAndDate,
  defaultWS, // default WebSocket handler
  connect, // translate text to speech by socket
  disconnect, // disconnect socket
  selectLanguage, // select language for translation
  connectState, // connect state for translation
  translateAudio, // translate text into audio by socket
  uploadPresignedS3Upload, // get pre-signed S3 upload URL
  viewPresignedS3Upload, // view pre-signed S3 upload URL
  loginAndGetCredentials // login and get AWS credentials from Cognito
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
const uploadS3RestApi = new RestApi(apiStack, "UploadS3VTGRestApi", {
  restApiName: "UploadS3VTGRestApi",
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

// get pre-sign URL
const uploadS3Path = uploadS3RestApi.root.addResource("uploads");
const uploadS3PresignURLPath = uploadS3Path.addResource("upload-presigned-url");
// add GET method to /channels/presign-url with sendChannelMessage Lambda integration
uploadS3PresignURLPath.addMethod("POST", new LambdaIntegration(
  backend.uploadPresignedS3Upload.resources.lambda
));

const viewS3PresignURLPath = uploadS3Path.addResource("view-presigned-url");
// add GET method to /channels/presign-url with sendChannelMessage Lambda integration
viewS3PresignURLPath.addMethod("GET", new LambdaIntegration(
  backend.viewPresignedS3Upload.resources.lambda
));

// =============3. API Getway, Lambda function for login cognito ===============
// 2.1. Add app instance user API
const loginCognitoRestApi = new RestApi(apiStack, "LoginCognitoVTGRestApi", {
  restApiName: "LoginCognitoVTGRestApi",
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

// login and get credentials
const loginCognitoPath = loginCognitoRestApi.root.addResource("cognito-login");
const getCredentialsPath = loginCognitoPath.addResource("credentials");
// add GET method to /credentials with sendChannelMessage Lambda integration
getCredentialsPath.addMethod("POST", new LambdaIntegration(
  backend.loginAndGetCredentials.resources.lambda
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

const tourMaxConnectionPath = tourPath.addResource("max-connection");
// add POST method to create /tours/batch with createTour Lambda integration
tourMaxConnectionPath.addMethod("POST", new LambdaIntegration(
  backend.calculateMaxConnection.resources.lambda
));

// add GET method to /tours with listTour Lambda integration
tourPath.addMethod("GET", new LambdaIntegration(
  backend.listTour.resources.lambda
));

const tourFindNamDatePath = tourPath.addResource("find");
// add GET method to /tours/find with getTour Lambda integration
tourFindNamDatePath.addMethod("POST", new LambdaIntegration(
  backend.getTourByNumberAndDate.resources.lambda
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

// add GET method for /tours/{TourID}/meeting with getMeetingByTourId Lambda integration
const meetingByTourIdPath = tourIdPath.addResource("meeting");
meetingByTourIdPath.addMethod("GET", new LambdaIntegration(
  backend.getMeetingByTourId.resources.lambda
));

// add PUT method for /tours/{TourID}/meeting with getMeetingByTourId Lambda integration
meetingByTourIdPath.addMethod("PUT", new LambdaIntegration(
  backend.updateMeetingByTourId.resources.lambda
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
  backend.createAdmin.resources.lambda
));

const userAuthPath = userPath.addResource("auth");
// add GET method to /users/{login} with getUser Lambda integration
userAuthPath.addMethod("GET", new LambdaIntegration(
  backend.checkAuth.resources.lambda
));

const userRefreshTokenPath = userPath.addResource("refreshToken");
// add GET method to /users/{login} with getUser Lambda integration
userRefreshTokenPath.addMethod("GET", new LambdaIntegration(
  backend.refreshToken.resources.lambda
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
const adminActivePath = userPath.addResource("active");
adminActivePath.addMethod("PUT", new LambdaIntegration(
  backend.activeAdmin.resources.lambda
));

// =============4. API Getway, Lambda function for Tour ===============
// Create WebSocket API
const webSocketApiProps = {
  apiName: "TranslateVTGWebSocketApi",
  routeSelectionExpression: "$request.body.action", // Define how to select the route based on the request body
  connectRouteOptions: {
    integration: new WebSocketLambdaIntegration(
      "ConnectIntegration",
      backend.connect.resources.lambda
    ),
  },
  disconnectRouteOptions: {
    integration: new WebSocketLambdaIntegration(
      "DisconnectIntegration",
      backend.disconnect.resources.lambda
    ),
  },
  defaultRouteOptions: {
    integration: new WebSocketLambdaIntegration(
      "DefaultIntegration",
      backend.defaultWS.resources.lambda
    ),
  }
}
const translateWebSocketApi = new WebSocketApi(apiStack, "TranslateVTGWebSocketApi", webSocketApiProps);

// Create a stage for the WebSocket API
const translateWebSocketStage = new WebSocketStage(apiStack, "TranslateWebSocketStage", {
  webSocketApi: translateWebSocketApi,
  stageName: "prod",
  autoDeploy: true, // Automatically deploy the stage
});

// 2. Add route: selectLanguage (listener select language for translation)
translateWebSocketApi.addRoute('selectLanguage', {
  integration: new WebSocketLambdaIntegration('SelectLanguageIntegration', backend.selectLanguage.resources.lambda),
});

// 2. Add route: connectState (listener select language for translation)
translateWebSocketApi.addRoute('connectState', {
  integration: new WebSocketLambdaIntegration('ConnectStateIntegration', backend.connectState.resources.lambda),
});

// 3. Add route: translateAudio (host send text -> translate + audio -> client)
translateWebSocketApi.addRoute('translateAudio', {
  integration: new WebSocketLambdaIntegration('TranslateAudioIntegration', backend.translateAudio.resources.lambda),
});

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
      [webSocketApiProps.apiName]: {
        endpoint: `${translateWebSocketApi.apiEndpoint}/${translateWebSocketStage.stageName}/`,
        region: Stack.of(translateWebSocketApi).region,
        apiName: webSocketApiProps.apiName,
      },
      [uploadS3RestApi.restApiName]: {
        endpoint: uploadS3RestApi.url,
        region: Stack.of(uploadS3RestApi).region,
        apiName: uploadS3RestApi.restApiName,
      },
      [loginCognitoRestApi.restApiName]: {
        endpoint: loginCognitoRestApi.url,
        region: Stack.of(loginCognitoRestApi).region,
        apiName: loginCognitoRestApi.restApiName,
      },
    },
  },
});