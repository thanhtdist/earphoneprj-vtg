// src/api.js
import { get, post } from 'aws-amplify/api';
import {
  ChimeSDKIdentityClient,
  //CreateAppInstanceUserCommand,
  ListAppInstanceUsersCommand,

} from "@aws-sdk/client-chime-sdk-identity"; // ES Modules import

import {
  ChimeSDKMessagingClient,
  ListChannelMessagesCommand,
} from '@aws-sdk/client-chime-sdk-messaging';
import Config from '../config';
const { v4: uuid } = require('uuid');
const API_URL = 'http://localhost:4000';

// export const createAppInstanceUsers = (appInstanceUserId) =>
//   `${Config.appInstanceArn}/user/${appInstanceUserId}`;


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

export async function listChannelMessages(channelArn, userArn) {
  const input = {
    ChimeBearer: userArn,
    ChannelArn: channelArn,
    SortOrder: 'DESCENDING',
  };
  const command = new ListChannelMessagesCommand(input);
  try {
    const response = await chimeSDKMessagingClient().send(command);
    console.log("listChannelMessages", response);
    return response;
  } catch (error) {
    console.error(error);
  }
}


export async function getAppInstanceUsers(userID) {
  try {
    const appInstanceUserArn = `${Config.appInstanceArn}/user/${userID}`;
    const restOperation = get({
      apiName: 'AppInstanceUserVTGRestApi',
      path: 'app-instance-users/' + encodeURIComponent(appInstanceUserArn),
    });
    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('GET call failed: ', JSON.parse(error.response.body));
  }
}

export async function createAppInstanceUsers(userID, userName) {
  try {
    // const checkExistingAppInstanceUser = await getAppInstanceUsers(userID);
    // if (checkExistingAppInstanceUser) {
    //   console.log("App Instance User already exists", checkExistingAppInstanceUser);
    //   return checkExistingAppInstanceUser;
    // }
    const restOperation = post({
      apiName: 'AppInstanceUserVTGRestApi',
      path: 'app-instance-users',
      options: {
        body: {
          appInstanceArn: Config.appInstanceArn,
          appInstanceUserId: userID,
          clientRequestToken: uuid(),
          name: userName,
          expirationCriterion: "CREATED_TIMESTAMP", 
          expirationDays: Config.appInstanceUserExpirationDays,
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

export async function createChannel(userArn) {
  try {
    const restOperation = post({
      apiName: 'ChannelVTGRestApi',
      path: 'channels',
      options: {
        body: {
          appInstanceArn: Config.appInstanceArn,
          name: 'LiveSession',
          mode: "UNRESTRICTED",
          privacy: "PUBLIC",
          clientRequestToken: uuid(),
          chimeBearer: userArn,
          expirationCriterion: "LAST_MESSAGE_TIMESTAMP", // CREATED_TIMESTAMP | LAST_MESSAGE_TIMESTAMP
          expirationDays: Config.channelExpirationDays,
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

export async function addChannelMembership(channelArn, userArn) {
  // const input = { // CreateChannelMembershipRequest
  //   ChannelArn: channelArn, // required
  //   MemberArn: userArn, // required
  //   Type: "DEFAULT", // required
  //   ChimeBearer: userArn, // required
  // };
  // const command = new CreateChannelMembershipCommand(input);
  // const response = await chimeSDKMessagingClient().send(command);
  // console.log("Add User to Channel Response", response);

  try {
    const restOperation = post({
      apiName: 'ChannelVTGRestApi',
      path: 'channels/' + encodeURIComponent(channelArn) + '/memberships',
      options: {
        body: {
          memberArn: userArn,
          type: "DEFAULT",
          chimeBearer: userArn,
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


export async function sendMessage(channelArn, userArn, inputMessage) {

  // // Send message using the Chime SDK Messaging Client
  // const input = {
  //   ChannelArn: channelArn, // Replace with your Channel ARN
  //   Content: inputMessage, // The actual message content
  //   Type: 'STANDARD', // or 'CONTROL' depending on your needs
  //   Persistence: 'PERSISTENT', // 'PERSISTENT' to store the message or 'NON_PERSISTENT' for ephemeral messages
  //   ClientRequestToken: new Date().getTime().toString(), // Unique token for idempotency
  //   ChimeBearer: userArn, // The ARN of the user sending the message
  // };

  // // Use the Chime SDK to send the message
  // const command = new SendChannelMessageCommand(input);
  // const response = await chimeSDKMessagingClient().send(command);
  // console.log("Send message", response);
  try {
    const restOperation = post({
      apiName: 'ChannelVTGRestApi',
      path: 'channels/' + encodeURIComponent(channelArn) + '/messages',
      options: {
        body: {
          channelArn: channelArn,
          content: inputMessage,
          type: "STANDARD",
          persistence: 'PERSISTENT',
          clientRequestToken: uuid(),
          chimeBearer: userArn,
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
      path: 'meetings',
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
      //path: 'meeting/?meetingId=' + meetingId,
      path: 'meetings/' + meetingId,
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
      apiName: 'MeetingVTGRestApi',
      path: 'meetings/' + meetingId + '/attendees',
      options: {
        body: {
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
