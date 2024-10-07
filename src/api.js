// src/api.js
import { get, post } from 'aws-amplify/api';
import {
  ChimeSDKIdentityClient,
  //CreateAppInstanceUserCommand,
  ListAppInstanceUsersCommand,
} from "@aws-sdk/client-chime-sdk-identity"; // ES Modules import

import {
  ChimeSDKMessagingClient,
  CreateChannelCommand,
  CreateChannelMembershipCommand,
  SendChannelMessageCommand
} from '@aws-sdk/client-chime-sdk-messaging';
import Config from './Config';
const { v4: uuid } = require('uuid');
const API_URL = 'http://localhost:4000';

export const createAppInstanceUsers = (appInstanceUserId) =>
  `${Config.appInstanceArn}/user/${appInstanceUserId}`;


export const chimeSDKIdentityClient = () =>
  new ChimeSDKIdentityClient({
    region: Config.region,
    credentials: {
      accessKeyId: Config.accessKeyId, // Ensure these are set properly
      secretAccessKey: Config.secretAccessKey,
    }
  });

export const chimeSDKMessagingClient = () =>
  new ChimeSDKMessagingClient({
    region: Config.region,
    credentials: {
      accessKeyId: Config.accessKeyId, // Ensure these are set properly
      secretAccessKey: Config.secretAccessKey,
    }
  });

export async function listUsers() {
  const input = {
    AppInstanceArn: Config.appInstanceArn,
  };
  const command = new ListAppInstanceUsersCommand(input);
  try {
    const response = await chimeSDKIdentityClient().send(command);
    console.log(response);
    return response;
  } catch (error) {
    console.error(error);
  }
};

export async function createChanel(userArn) {
  const input = {
    AppInstanceArn: Config.appInstanceArn,
    Name: 'LiveSession',
    Mode: "UNRESTRICTED",
    Privacy: "PUBLIC",
    ClientRequestToken: `token-${Date.now()}`,
    ChimeBearer: userArn
  }
  const command = new CreateChannelCommand(input);
  const response = await chimeSDKMessagingClient().send(command);
  console.log("Create Channel Response", response);
  return response;
}

export async function addUserToChannel(channelArn, userArn) {
  const input = { // CreateChannelMembershipRequest
    ChannelArn: channelArn, // required
    MemberArn: userArn, // required
    Type: "DEFAULT", // required
    ChimeBearer: userArn, // required
  };
  const command = new CreateChannelMembershipCommand(input);
  const response = await chimeSDKMessagingClient().send(command);
  console.log("Add User to Channel Response", response);
}


export async function sendMessage(channelArn, userArn, inputMessage) {

 // Send message using the Chime SDK Messaging Client
 const input = {
  ChannelArn: channelArn, // Replace with your Channel ARN
  Content: inputMessage, // The actual message content
  Type: 'STANDARD', // or 'CONTROL' depending on your needs
  Persistence: 'PERSISTENT', // 'PERSISTENT' to store the message or 'NON_PERSISTENT' for ephemeral messages
  ClientRequestToken: new Date().getTime().toString(), // Unique token for idempotency
  ChimeBearer: userArn, // The ARN of the user sending the message
};

  // Use the Chime SDK to send the message
  const command = new SendChannelMessageCommand(input);
  const response = await chimeSDKMessagingClient().send(command);
  console.log("Send message", response);
}


// Function to create a meeting
export async function createMeeting() {
  // const response = await fetch(`https://gqr4dc3syf.execute-api.ap-northeast-1.amazonaws.com/dev/meeting`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     clientRequestToken: uuid(),  // Unique token for the meeting
  //     externalMeetingId: uuid(),  // Unique ID for the meeting
  //   }),
  // });

  // const result = await response.json();
  // console.log("createMeeting", result.data);
  // return result.data;
  try {
    const restOperation = post({
      apiName: 'MeetingVTGRestApi',
      path: 'meeting',
      options: {
        body: {
          clientRequestToken: uuid(),
          externalMeetingId: uuid(),
        }
      }
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call failed: ', JSON.parse(error.response.body));
  }

}

export async function getMeeting(meetingId) {
  // const response = await fetch(`https://gqr4dc3syf.execute-api.ap-northeast-1.amazonaws.com/dev/meeting/?meetingId=${meetingId}`, {
  //   method: 'GET',
  //   headers: { 'Content-Type': 'application/json' },
  // });

  // const data = await response.json();
  // return data.meeting;
  try {
    const restOperation = get({
      apiName: 'MeetingVTGRestApi',
      path: 'meeting/?meetingId=' + meetingId,
    });
    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('GET call failed: ', JSON.parse(error.response.body));
  }
}

// Function to create an attendee (used by both host and listeners)
export async function createAttendee(meetingId, externalUserId) {
  // const response = await fetch(`https://rtp02fdc7i.execute-api.ap-northeast-1.amazonaws.com/dev/attendee`, {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({
  //     meetingId,
  //     externalUserId
  //   }),
  // });

  // const result = await response.json();
  // return result.data;
  try {
    const restOperation = post({
      apiName: 'AttendeeVTGRestApi',
      path: 'attendee',
      options: {
        body: {
          meetingId: meetingId,
          externalUserId: externalUserId,
        }
      }
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call failed: ', JSON.parse(error.response.body));
  }
}

export async function createRecording(meetingId) {
  const response = await fetch(`${API_URL}/start-recording`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      meetingId,
    }),
  });

  const data = await response.json();
  return data.pipeline;
}

export async function stopRecording(mediaPipelineId) {
  const response = await fetch(`${API_URL}/stop-recording`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mediaPipelineId,
    }),
  });

  const data = await response.json();
  return data.pipeline;
}
