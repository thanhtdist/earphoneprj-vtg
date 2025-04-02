import { get, post, put } from 'aws-amplify/api';
import Cookies from "js-cookie";
import { refreshToken } from './admin'; // import your refreshToken function

async function requestWithRefresh(method, params) {
  try {
    const response = method(params); // Call the original method
    console.log("requestWithRefresh response", response);
    return response
  } catch (error) {
    if (error.response?.statusCode === 401) {
      console.error("requestWithRefresh Token expired, refreshing...");
      await refreshToken(); 
      // Update Cookies with the new token here
      return await method(params); // retry with refreshed token
    }
    throw error;
  }
}

export async function getWithAuth(params) {
  params.options = params.options || {};
  params.options.headers = {
    Authorization: `Bearer ${Cookies.get("accessToken")}`,
    ...params.options.headers
  };
  console.log("getWithAuth params", params);
  return requestWithRefresh(get, params);
}

export async function postWithAuth(params) {
  params.options = params.options || {};
  params.options.headers = {
    Authorization: `Bearer ${Cookies.get("accessToken")}`,
    ...params.options.headers
  };
  return requestWithRefresh(post, params);
}

export async function putWithAuth(params) {
  params.options = params.options || {};
  params.options.headers = {
    Authorization: `Bearer ${Cookies.get("accessToken")}`,
    ...params.options.headers
  };
  return requestWithRefresh(put, params);
}