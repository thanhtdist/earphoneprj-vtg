// This file contains the API functions to interact with the backend services
import { get, post, put } from 'aws-amplify/api';
import Config from '../utils/config';
import Cookies from "js-cookie";
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
    // const errorResponse = JSON.parse(error.response.body);
    // console.log('GET call getMeeting failed: ', errorResponse);
    // throw new Error('GET call getMeeting failed: ', JSON.parse(error.response.body));
    throw error.response.body;
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

/**
 * List the participants to join the meeting
 * @param {string} meetingId - The ID of the meeting.
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function listAttendee(meetingId) {
  try {
    const restOperation = get({
      apiName: 'MeetingVTGRestApi', // The name of the API defined in backend.ts
      path: 'meetings/' + meetingId + '/attendees', // endpoint defined in backend.ts, meetingId is dynamically passed
    });
    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('GET call listAttendee failed: ', JSON.parse(error.response.body));
  }
}

/**
 * List the app instance users to join the group chat
 * @param {string} appInstanceArn - The Arn of the app instance.
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function listAppInstanceUser(appInstanceArn) {
  try {
    const restOperation = get({
      apiName: 'AppInstanceUserVTGRestApi', // The name of the API defined in backend.ts
      path: 'app-instance-users/?appInstanceArn=' + encodeURIComponent(appInstanceArn), // endpoint defined in backend.ts, appInstanceArn is dynamically passed
    });
    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('GET call listAppInstanceUser failed: ', JSON.parse(error.response.body));
  }
}

export async function startMeetingTranscription(meetingId, languageCode) {
  try {
    const restOperation = post({
      apiName: 'MeetingVTGRestApi', // The name of the API defined in backend.ts
      path: 'meetings/' + meetingId + '/transcription', // endpoint defined in backend.ts, meetingId is dynamically passed
      options: {
        body: {
          languageCode: languageCode, // The external ID of the user, it is userId of participant joined the meeting
        }
      }
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call startMeetingTranscription failed: ', JSON.parse(error.response.body));
  }
}

export async function translateTextSpeech(inputText, sourceLanguageCode, targetLanguageCode, engine) {
  try {
    const restOperation = post({
      apiName: 'TranslateVTGRestApi', // The name of the API defined in backend.ts
      path: 'translate-text-speech', // endpoint defined in backend.ts, meetingId is dynamically passed
      options: {
        body: {
          inputText: inputText, // The text to be translated
          sourceLanguageCode: sourceLanguageCode, // the source language code
          targetLanguageCode: targetLanguageCode, // the target language code
          engine: engine, // the engine to be used for translation
        }
      }
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call translateTextSpeech failed: ', JSON.parse(error.response.body));
  }
}

/**
 * Book a tour by the admin
 * @param {json} data - The data of the tour to be created
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function createTour(data) {
  try {
    const restOperation = post({
      apiName: 'TourVTGRestApi', // The name of the API defined in backend.ts
      path: 'tours', // endpoint defined in backend.ts 
      options: {
        body: {
          tourNumber: data.tourNumber,
          tourName: data.tourName,
          departureDate: data.departureDate,
          returnDate: data.returnDate,
          processingNumber: data.processingNumber,
          acceptanceDate: data.acceptanceDate,
          planningOfficeName: data.planningOfficeName,
          planningSalesOfficeName: data.planningSalesOfficeName,
          planningSalesOfficeTeamName: data.planningSalesOfficeTeamName,
          contactPersonName: data.contactPersonName,
          contactPersonEmail: data.contactPersonEmail,
          numberOfDevices: data.numberOfDevices,
          numberOfTransmitters: data.numberOfTransmitters,
          qrCodeDestination: data.qrCodeDestination,
          emailCustomer: data.emailCustomer,
          phoneNumberCustomer: data.phoneNumberCustomer,
          otherRemarks: data.otherRemarks,
          meetingId: data.meetingId,
          channelId: data.channelId,
          chatRestriction: data.chatRestriction,
        }
      }
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call createTour failed: ', JSON.parse(error.response.body));
    return JSON.parse(error.response.body);
  }

}

/**
 * Create a batch tour by the admin
 * @param {json} data - The list data of the tours to be created
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function createBatchTour(data) {
  console.log('createBatchTour data', data);
  try {
    const restOperation = post({
      apiName: 'TourVTGRestApi', // The name of the API defined in backend.ts
      path: 'tours/batch', // endpoint defined in backend.ts 
      options: {
        body: data
      }
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call createBatchTour failed: ', JSON.parse(error.response.body));
  }

}

/**
 * Update a tour by the admin
 * @param {json} data - The data of the tour to be created
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function updateTour(data) {
  try {
    const restOperation = put({
      apiName: 'TourVTGRestApi', // The name of the API defined in backend.ts
      path: 'tours/' + data.tourId, // endpoint defined in backend.ts 
      options: {
        body: {
          tourId: data.tourId,
          tourNumber: data.tourNumber,
          tourName: data.tourName,
          departureDate: data.departureDate,
          returnDate: data.returnDate,
          processingNumber: data.processingNumber,
          acceptanceDate: data.acceptanceDate,
          planningOfficeName: data.planningOfficeName,
          planningSalesOfficeName: data.planningSalesOfficeName,
          planningSalesOfficeTeamName: data.planningSalesOfficeTeamName,
          contactPersonName: data.contactPersonName,
          contactPersonEmail: data.contactPersonEmail,
          numberOfDevices: data.numberOfDevices,
          numberOfTransmitters: data.numberOfTransmitters,
          qrCodeDestination: data.qrCodeDestination,
          emailCustomer: data.emailCustomer,
          phoneNumberCustomer: data.phoneNumberCustomer,
          otherRemarks: data.otherRemarks,
          chatRestriction: data.chatRestriction,
        }
      }
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call updateTour failed: ', JSON.parse(error.response.body));
    return JSON.parse(error.response.body);
  }

}

/**
 * Delete a tour by the admin with delete flag = 1
 * @param {json} data - The data of the tour to be created
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function deleteTour(data) {
  try {
    const restOperation = put({
      apiName: 'TourVTGRestApi', // The name of the API defined in backend.ts
      path: 'tours/' + data.tourId + "/delete", // endpoint defined in backend.ts 
      // options: {
      //   body: {
      //     userId: data.userId,
      //   }
      // }
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call deleteTour(soft delete) failed: ', JSON.parse(error.response.body));
  }

}

/**
 * Get a list of tours
 * @param {json} data - The data of the tour to be listed: page, pageSize, query
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function listTours(data) {
  try {
    const restOperation = get({
      apiName: 'TourVTGRestApi', // The name of the API defined in backend.ts
      path: 'tours/?page=' + data.page + '&pageSize=' + data.pageSize + '&query=' + encodeURIComponent(data.query), // endpoint defined in backend.ts, appInstanceArn is dynamically passed
    });
    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('GET call listTours failed: ', JSON.parse(error.response.body));
  }
}

/**
 * Get a detail of a tour
 * @param {string} tourId - The ID of the meeting.
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function getTour(tourId) {
  try {
    const restOperation = get({
      apiName: 'TourVTGRestApi', // The name of the API defined in backend.ts
      path: 'tours/' + tourId, // endpoint defined in backend.ts, tourId is dynamically passed
    });
    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('GET call getTour failed: ', JSON.parse(error.response.body));
  }
}
/**
 * Create a admin by the admin
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function createUser(data) {
  try {
    const restOperation = post({
      apiName: 'UserVTGRestApi', // The name of the API defined in backend.ts
      path: 'users', // endpoint defined in backend.ts 
      options: {
        body: {
          userName: data.userName,
          email: data.email,
          password: data.password,
        }
      }
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call createTour failed: ', JSON.parse(error.response.body));
  }
}

/**
 * Get list admin
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function listAdmins(data) {
  // try {
  //   //encodeURIComponent
  //   const restOperation = get({
  //     apiName: 'UserVTGRestApi', // The name of the API defined in backend.ts
  //     path: 'users', // endpoint defined in backend.ts 

  //   });

  //   const { body } = await restOperation.response;
  //   const response = await body.json();
  //   return response.data;
  // } catch (error) {
  //   console.log('POST call get list amdin failed: ', JSON.parse(error.response.body));
  // }
  try {
    const restOperation = get({
      apiName: 'UserVTGRestApi', // The name of the API defined in backend.ts
      path: 'users/?page=' + data.page + '&pageSize=' + data.pageSize + '&query=' + encodeURIComponent(data.query), // endpoint defined in backend.ts, appInstanceArn is dynamically passed
    });
    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('GET call listTours failed: ', JSON.parse(error.response.body));
  }
}

/**
 * Get detail admin
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function getDetailAdmin(userId) {
  try {
    const restOperation = get({
      apiName: 'UserVTGRestApi', // The name of the API defined in backend.ts
      path: 'users/' + userId, // endpoint defined in backend.ts 
      withCredentials: true
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call get detail amdin failed: ', JSON.parse(error.response.body));
  }
}

/**
 * Update a admin
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function updateAdmin(data) {
  try {
    const restOperation = put({
      apiName: 'UserVTGRestApi', // The name of the API defined in backend.ts
      path: 'users', // endpoint defined in backend.ts 
      options: {
        body: {
          userId: data.userId,
          userName: data.userName,
          password: data.password,
        }
      }
    });
    console.log("api data", data);

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('PUT update admin false: ', JSON.parse(error.response.body));
  }
}
/**
 * Delete a admin by other admin with delete flag = 1
 * @param {json} data - The data of the tour to be created
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function deleteAdmin(userId) {
  try {
    const restOperation = put({
      apiName: 'UserVTGRestApi', // The name of the API defined in backend.ts
      path: 'users/' + userId + "/delete", // endpoint defined in backend.ts 
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('post call delete user(soft delete) failed: ', JSON.parse(error.response.body));
  }

}

/**
 * Login a admin by email and password
 * @param {json} data - The data of the tour to be created
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function loginAdmin(data) {
  try {
    const restOperation = post({
      apiName: 'UserVTGRestApi', // The name of the API defined in backend.ts
      path: 'users/login', // Endpoint defined in backend.ts
      options: {
        body: {
          email: data.email,
          password: data.password,
        },
      },
      withCredentials: true, // Ensures the HttpOnly cookie is sent
    });

    const { statusCode, body } = await restOperation.response;
    const response = await body.json();

    return {
      statusCode,
      data: response.data,
    };
  } catch (error) {
    const errorMessage = error.response?.body
      ? JSON.parse(error.response.body)?.error || 'An unexpected error occurred'
      : error.message;

    console.error('POST call login failed:', errorMessage);

    return {
      statusCode: error.response?.statusCode || 500,
      error: errorMessage,
    };
  }
}

/**
 * Check auth in session
 * @param {json} data - The data of the tour to be created
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function checkAuth() {
  try {
    const restOperation = get({
      apiName: 'UserVTGRestApi', // The name of the API defined in backend.ts
      path: 'users/auth', // endpoint defined in backend.ts 
      options: {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Cookies.get("accessToken")}` // Include the access token in the headers
        },
      }
    });

    const { statusCode, body } = await restOperation.response;
    const response = await body.json();
    return {
      statusCode,
      data: response.data,
    };
  } catch (error) {
    console.log('post call check Auth failed: ', JSON.parse(error.response.body));
    return JSON.parse(error.response.body);
  }

}

/**
 * Check auth in session
 * @param {json} data - The data of the tour to be created
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function refreshToken() {
  try {
    const restOperation = get({
      apiName: 'UserVTGRestApi', // The name of the API defined in backend.ts
      path: 'users/refreshToken', // endpoint defined in backend.ts 
      options: {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Cookies.get("refreshToken")}` // Include the refresh token in the headers
        },
      }
    });

    const { statusCode, body } = await restOperation.response;
    const response = await body.json();
    return {
      statusCode,
      data: response.data,
    };
  } catch (error) {
    console.log('post call refresh Token failed: ', JSON.parse(error.response.body));
    return JSON.parse(error.response.body);
  }

}

/**
 * Active amdin by other admin 
 * @param {json} data - The data of the tour to be created
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function activeAdmin(data) {
  try {
    const restOperation = put({
      apiName: 'UserVTGRestApi', // The name of the API defined in backend.ts
      path: 'users/active', // endpoint defined in backend.ts 
      options: {
        body: {
          userId: data.userId,
          active: data.active,
        }
      }
    });
    console.log("api data", data);

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('PUT update admin false: ', JSON.parse(error.response.body));
  }

}