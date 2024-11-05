// This file contains the API functions to interact with the backend services
import { get, post } from 'aws-amplify/api';
import Config from '../utils/config';
const { v4: uuid } = require('uuid');
/**
 * Create an app instance user for chat by the participants when joining a group chat
 * @param {string} userID - The ID of the user to be created.
 * @param {string} userName - The name of the user to be created.
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function createAppInstanceUsers(userID, userName) {
  try {
    const restOperation = post({
      apiName: 'AppInstanceUserVTGRestApi', // The name of the API defined in backend.ts
      path: 'app-instance-users', // endpoint defined in backend.ts
      options: {
        body: {
          appInstanceArn: Config.appInstanceArn, // The ARN of the app instance created in the AWS Chime SDK CLI
          appInstanceUserId: userID, // The ID of the user to be created
          clientRequestToken: uuid(), // Token of the user, generated using uuid because ignored user management
          name: userName, // The name of the user to be created
          expirationCriterion: "CREATED_TIMESTAMP",  // Criterion expiration of the user
          expirationDays: Config.appInstanceUserExpirationDays, // Expiration days for the user
        }
      }
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call createAppInstanceUsers failed: ', JSON.parse(error.response.body));
  }
}

/**
 * Create a channel (group chat) by the host so the participants can join
 * @param {string} userArn - The Arn of the user.
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function createChannel(userArn) {
  try {
    const restOperation = post({
      apiName: 'ChannelVTGRestApi', // The name of the API defined in backend.ts
      path: 'channels', // endpoint defined in backend.ts
      options: {
        body: {
          appInstanceArn: Config.appInstanceArn, // The ARN of the app instance created in the AWS Chime SDK CLI
          name: 'LiveSession', // The name of the channel
          mode: "UNRESTRICTED", // Channel mode: RESTRICTED or UNRESTRICTED
          privacy: "PUBLIC", // The channel's privacy level: PUBLIC or PRIVATE
          clientRequestToken: uuid(), // Token of the user, generated using uuid because ignored user management
          chimeBearer: userArn, // The Arn of the user to authenticate the chime SDK
          expirationCriterion: "LAST_MESSAGE_TIMESTAMP", // Criterion expiration of the channel: CREATED_TIMESTAMP or LAST_MESSAGE_TIMESTAMP
          expirationDays: Config.channelExpirationDays, // Expiration days for the channel
        }
      }
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call createChannel failed: ', JSON.parse(error.response.body));
  }
}

/**
 * Add participants to a channel (group chat)
 * @param {string} channelArn - The Arn of the channel.
 * @param {string} userArn - The Arn of the user.
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function addChannelMembership(channelArn, userArn) {
  try {
    const restOperation = post({
      apiName: 'ChannelVTGRestApi',  // The name of the API defined in backend.ts
      path: 'channels/' + encodeURIComponent(channelArn) + '/memberships', // endpoint defined in backend.ts, channelArn is dynamically passed
      options: {
        body: {
          memberArn: userArn, // The Arn of the user to be added to the channel
          type: "DEFAULT", // The type of the user: DEFAULT or HIDDEN
          chimeBearer: userArn, //The Arn of the user to authenticate the chime SDK
        }
      }
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call addChannelMembership failed: ', JSON.parse(error.response.body));
  }
}

/**
 * List participants of a channel (group chat)  
 * @param {string} channelArn - The Arn of the channel.
 * @param {string} userArn - The Arn of the user.
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function listChannelMembership(channelArn, userArn) {
  try {
    const restOperation = get({
      apiName: 'ChannelVTGRestApi',  // The name of the API defined in backend.ts
      path: 'channels/' + encodeURIComponent(channelArn) + '/memberships', // endpoint defined in backend.ts, channelArn is dynamically passed
      options: {
        headers: {
          'x-amz-chime-bearer': userArn, // The Arn of the user to authenticate the chime SDK
        },
      }
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('GET call listChannelMembership failed: ', JSON.parse(error.response.body));
  }
}

/**
 * Send a message to a channel(group chat)
 * @param {string} channelArn - The Arn of the channel.
 * @param {string} userArn - The Arn of the user.
 * @param {string} inputMessage - The message to be sent.
 * @param {string} options - The metadata of the message.
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function sendMessage(channelArn, userArn, inputMessage, options) {
  console.log('sendMessage options', options);
  try {
    const restOperation = post({
      apiName: 'ChannelVTGRestApi', // The name of the API defined in backend.ts
      path: 'channels/' + encodeURIComponent(channelArn) + '/messages', // endpoint defined in backend.ts, channelArn is dynamically passed
      options: {
        body: {
          channelArn: channelArn, // The Arn of the channel
          content: inputMessage, // The message to be sent
          type: "STANDARD", // The type of the message: STANDARD or CONTROL
          persistence: 'PERSISTENT', // The persistence of the message: PERSISTENT or NON_PERSISTENT
          clientRequestToken: uuid(), // Token of the user, generated using uuid because ignored user management
          chimeBearer: userArn, // The Arn of the user to authenticate the chime SDK
          metadata: options, // The metadata of the message, such as attachments information
        }
      }
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call sendMessage failed: ', JSON.parse(error.response.body));
  }
}

/**
 * Create a meeting when the host starts the meeting to brocast the audio
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function createMeeting() {
  try {
    const restOperation = post({
      apiName: 'MeetingVTGRestApi', // The name of the API defined in backend.ts
      path: 'meetings', // endpoint defined in backend.ts 
      options: {
        body: {
          clientRequestToken: uuid(), // Token of the user, generated using uuid because ignored user management
          externalMeetingId: uuid(), // The external ID of the meeting, generated using uuid
        }
      }
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call createMeeting failed: ', JSON.parse(error.response.body));
  }

}

/**
 * Get a meeting by the participants to join the meeting
 * @param {string} meetingId - The ID of the meeting.
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function getMeeting(meetingId) {
  try {
    const restOperation = get({
      apiName: 'MeetingVTGRestApi', // The name of the API defined in backend.ts
      path: 'meetings/' + meetingId, // endpoint defined in backend.ts, meetingId is dynamically passed
    });
    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('GET call getMeeting failed: ', JSON.parse(error.response.body));
  }
}

/**
 * Add a participant to a meeting to listen to the audio
 * @param {string} meetingId - The ID of the meeting.
 * @param {string} externalUserId  - The external user ID for attendee.
  * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function createAttendee(meetingId, externalUserId) {
  try {
    const restOperation = post({
      apiName: 'MeetingVTGRestApi', // The name of the API defined in backend.ts
      path: 'meetings/' + meetingId + '/attendees', // endpoint defined in backend.ts, meetingId is dynamically passed
      options: {
        body: {
          externalUserId: externalUserId, // The external ID of the user, it is userId of participant joined the meeting
        }
      }
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call createAttendee failed: ', JSON.parse(error.response.body));
  }
}