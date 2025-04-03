import { get, post, put } from 'aws-amplify/api';
import Cookies from "js-cookie";
import { refreshToken } from './admin'; // import your refreshToken function

async function requestWithRefresh(method, params) {
  try {
    const restOperation = method(params); // Call the original method
    await restOperation.response;
    return restOperation
  } catch (error) {
    console.error("requestWithRefresh error response", error.response);
    //if (error.response?.statusCode === 401) {
    if (error.response?.statusCode === 401 || error.response?.statusCode === 403) {
      console.error("requestWithRefresh Token expired, refreshing...");
      const refreshTokenResponse = await refreshToken();
      if (refreshTokenResponse.statusCode !== 200) {
        // throw new Error("Failed to refresh token");
        Cookies.remove("accessToken");
        Cookies.remove("refreshToken");
      }
      // Update Cookies with the new token here
      Cookies.set("accessToken", refreshTokenResponse.data.accessToken);
      Cookies.set("refreshToken", refreshTokenResponse.data.refreshToken);
      params.options.headers = {
        Authorization: `Bearer ${Cookies.get("accessToken")}`
      };
      return await method(params); // retry with refreshed token
    }
    // User is not found or deleted
    if (error.response?.statusCode === 404) {
      Cookies.remove("accessToken");
      Cookies.remove("refreshToken");
      window.location.href = "/admin/login";
      return;
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