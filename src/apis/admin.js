
import { get, post } from 'aws-amplify/api';
import { getWithAuth, postWithAuth, putWithAuth } from './common';
import { apiWrapper } from './utils'; // Import the apiWrapper function
import Cookies from "js-cookie";
/**
 * Book a tour by the admin
 * @param {json} data - The data of the tour to be created
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function createTour(data) {
  // const payload = {
  //   tourNumber: "", // hoặc set default ở chỗ khác
  //   tourName: data.tourName,
  //   departureDate: data.departureDate,
  //   returnDate: data.returnDate,
  //   processingNumber: data.processingNumber,
  //   acceptanceDate: data.acceptanceDate,
  //   planningOfficeName: data.planningOfficeName,
  //   planningSalesOfficeName: data.planningSalesOfficeName,
  //   planningSalesOfficeTeamName: data.planningSalesOfficeTeamName,
  //   contactPersonName: data.contactPersonName,
  //   contactPersonEmail: data.contactPersonEmail,
  //   numberOfDevices: data.numberOfDevices,
  //   numberOfTransmitters: data.numberOfTransmitters,
  //   qrCodeDestination: data.qrCodeDestination,
  //   emailCustomer: data.emailCustomer,
  //   phoneNumberCustomer: data.phoneNumberCustomer,
  //   otherRemarks: data.otherRemarks,
  //   meetingId: data.meetingId,
  //   channelId: data.channelId,
  //   chatRestriction: data.chatRestriction,
  // };
  return apiWrapper(postWithAuth({
    apiName: 'TourVTGRestApi',
    path: 'tours',
    options: { body: data }
  }));
}

/**
 * Create a batch tour by the admin
 * @param {json} data - The list data of the tours to be created
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function createBatchTour(data) {
  return apiWrapper(postWithAuth({
    apiName: 'TourVTGRestApi',
    path: 'tours/batch',
    options: { body: data }
  }));
}

/**
 * Update a tour by the admin
 * @param {json} data - The data of the tour to be created
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function updateTour(data) {
  try {
    const restOperation = await putWithAuth({
      apiName: 'TourVTGRestApi', // The name of the API defined in backend.ts
      path: 'tours/' + data.tourId, // endpoint defined in backend.ts 
      options: {
        body: {
          tourId: data.tourId,
          tourNumber: data.tourNumber,
          courseName :  data.courseName,
          planningAndSalesSignature:  data.planningAndSalesSignature,
          planningSalesOfficeTeamName:  data.planningSalesOfficeTeamName,
          departureDate:  data.departureDate,
          returnDate:  data.returnDate,
          nameOfCoursePersonInCharge:  data.nameOfCoursePersonInCharge,
          tourConductorName:  data.tourConductorName,
          numberOfReceiversInUse:  data.numberOfReceiversInUse,
          numberOfSendingDevices:  data.numberOfSendingDevices,
          subGuideFunctionAvailable:  data.subGuideFunctionAvailable,
          useTheTranslationFunction:  data.useTheTranslationFunction,
          coSponsoredCourseNumber:  data.coSponsoredCourseNumber,
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
    const restOperation = await putWithAuth({
      apiName: 'TourVTGRestApi', // The name of the API defined in backend.ts
      path: 'tours/' + data.tourId + "/delete", // endpoint defined in backend.ts 
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
  // try {
  //   const restOperation = await getWithAuth({
  //     apiName: 'TourVTGRestApi', // The name of the API defined in backend.ts
  //     path: 'tours/?page=' + data.page + '&pageSize=' + data.pageSize + '&query=' + encodeURIComponent(data.query), // endpoint defined in backend.ts, appInstanceArn is dynamically passed
  //   });
  //   console.log('listTours restOperation', restOperation);
  //   const { body } = await restOperation.response;
  //   console.log('listTours body', body);
  //   const response = await body.json();
  //   console.log('listTours response', response);
  //   return response.data;
  // } catch (error) {
  //   console.log('GET call listTours failed: ', JSON.parse(error.response.body));
  //   //console.log('GET call listTours failed: ', JSON.parse(error.response.body));
  // }

  return apiWrapper(getWithAuth({
    apiName: 'TourVTGRestApi',
    path: 'tours/?page=' + data.page + '&pageSize=' + data.pageSize + '&query=' + encodeURIComponent(data.query), // endpoint defined in backend.ts, appInstanceArn is dynamically passed
  }));

}

/**
 * Get a detail of a tour
 * @param {string} tourId - The ID of the meeting.
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function getTour(tourId) {
  try {
    const restOperation = await getWithAuth({
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
  // try {
  //   const restOperation = await postWithAuth({
  //     apiName: 'UserVTGRestApi', // The name of the API defined in backend.ts
  //     path: 'users', // endpoint defined in backend.ts 
  //     options: {
  //       body: {
  //         userName: data.userName,
  //         email: data.email,
  //         password: data.password,
  //       }
  //     }
  //   });

  //   const { body } = await restOperation.response;
  //   const response = await body.json();
  //   return response.data;
  // } catch (error) {
  //   console.log('POST call createUser failed: ', JSON.parse(error.response.body));
  // }
   return apiWrapper(postWithAuth({
    apiName: 'UserVTGRestApi',
    path: 'users',
    options: { 
      body: {
          userName: data.userName,
          email: data.email,
          password: data.password,
        } }
  }));
}

/**
 * Get list admin
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function listAdmins(data) {
  try {
    const restOperation = await getWithAuth({
      apiName: 'UserVTGRestApi', // The name of the API defined in backend.ts
      path: 'users/?page=' + data.page + '&pageSize=' + data.pageSize + '&query=' + encodeURIComponent(data.query), // endpoint defined in backend.ts, appInstanceArn is dynamically passed
    });
    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('GET call listAdmins failed: ', JSON.parse(error.response.body));
  }
}

/**
 * Get detail admin
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function getDetailAdmin(userId) {
  try {
    const restOperation = await getWithAuth({
      apiName: 'UserVTGRestApi', // The name of the API defined in backend.ts
      path: 'users/' + userId, // endpoint defined in backend.ts 
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('POST call getDetailAdmin failed: ', JSON.parse(error.response.body));
  }
}

/**
 * Update a admin
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function updateAdmin(data) {
  try {
    const restOperation = await putWithAuth({
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
    console.log('PUT call updateAdmin failed: ', JSON.parse(error.response.body));
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
    const restOperation = await putWithAuth({
      apiName: 'UserVTGRestApi', // The name of the API defined in backend.ts
      path: 'users/' + userId + "/delete", // endpoint defined in backend.ts 
    });

    const { body } = await restOperation.response;
    const response = await body.json();
    return response.data;
  } catch (error) {
    console.log('post call deleteAdmin(soft delete) failed: ', JSON.parse(error.response.body));
  }

}

/**
 * Login a admin by email and password
 * @param {json} data - The data of the tour to be created
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function loginAdmin(data) {
  return apiWrapper(post({
    apiName: 'UserVTGRestApi',
    path: 'users/login',
    options: { body: data }
  }));
}

/**
 * Check auth in session
 * @param {json} data - The data of the tour to be created
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function checkAuth() {
  // try {
  //   const restOperation = get({
  //     apiName: 'UserVTGRestApi', // The name of the API defined in backend.ts
  //     path: 'users/auth', // endpoint defined in backend.ts 
  //     options: {
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization: `Bearer ${Cookies.get("accessToken")}` // Include the access token in the headers
  //       },
  //     }
  //   });

  //   const { statusCode, body } = await restOperation.response;
  //   const response = await body.json();
  //   return {
  //     statusCode,
  //     data: response.data,
  //   };
  // } catch (error) {
  //   console.log('post call check Auth failed: ', JSON.parse(error.response.body));
  //   return JSON.parse(error.response.body);
  // }
  return apiWrapper(get({
    apiName: 'UserVTGRestApi',
    path: 'users/auth',
    options: {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Cookies.get("accessToken")}` // Include the access token in the headers
      },
    }
  }));

}

/**
 * Check auth in session
 * @param {json} data - The data of the tour to be created
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function refreshToken() {
  // try {
  //   const restOperation = get({
  //     apiName: 'UserVTGRestApi', // The name of the API defined in backend.ts
  //     path: 'users/refreshToken', // endpoint defined in backend.ts 
  //     options: {
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization: `Bearer ${Cookies.get("refreshToken")}` // Include the refresh token in the headers
  //       },
  //     }
  //   });

  //   const { statusCode, body } = await restOperation.response;
  //   const response = await body.json();
  //   return {
  //     statusCode,
  //     data: response.data,
  //   };
  // } catch (error) {
  //   console.log('post call refresh Token failed: ', JSON.parse(error.response.body));
  //   return JSON.parse(error.response.body);
  // }

  return apiWrapper(get({
    apiName: 'UserVTGRestApi',
    path: 'users/refreshToken',
    options: {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Cookies.get("refreshToken")}` // Include the refresh token in the headers
      },
    }
  }));

}

/**
 * Active amdin by other admin 
 * @param {json} data - The data of the tour to be created
 * @returns {Promise<any>} The response data from the API call.
 * @throws {Error} Logs the error details if the POST call fails.
 */
export async function activeAdmin(data) {
  try {
    const restOperation = await putWithAuth({
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
    console.log('PUT call activeAdmin false: ', JSON.parse(error.response.body));
  }

}