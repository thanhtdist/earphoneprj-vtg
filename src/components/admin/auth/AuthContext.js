import { createContext, useContext, useState, useEffect, useCallback } from "react";
import Cookies from "js-cookie";
import {
  checkAuth,
  refreshToken
} from '../../../apis/admin';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(undefined); // Initialize user state


  const callCheckAuth = useCallback(async () => {
    try {
      const checkAuthResponse = await checkAuth();
      console.log("checkAuthResponse", checkAuthResponse);
      if (checkAuthResponse.statusCode === 200) {
        console.log("checkAuthResponse data user", checkAuthResponse.data.data);
        setUser(checkAuthResponse.data.data); // Assuming the API returns user data
        setIsAuthenticated(true);
      } else {
        setUser(null); // Set user to null if authentication fails
        setIsAuthenticated(false);
      }
    } catch (error) {
      setUser(null); // Set user to null if an error occurs
      setIsAuthenticated(false);
    }
  }, []);

  console.log("callCheckAuth setIsAuthenticated", isAuthenticated);
  console.log("callCheckAuth user", user);

  const login = useCallback((accessToken, refreshToken) => {
    Cookies.set("accessToken", accessToken, {
      //expires: 15 / (60 * 24), // 15 minutes
      expires: 5 / (60 * 24), // 15 minutes
      // secure: true,
      // sameSite: "strict",
      // path: "/"
    });
    Cookies.set("refreshToken", refreshToken, {
      expires: 7, // 7 days
      // secure: true,
      // sameSite: "strict",
      // path: "/"
    });
    //setIsAuthenticated(true);
    callCheckAuth();
    window.location.href = "/admin/tour";

  }, [callCheckAuth]); // Placeholder for login function

  // Logout function to remove tokens from cookies and update authentication state
  const logout = () => {
    Cookies.remove("accessToken");
    Cookies.remove("refreshToken");
    //setIsAuthenticated(false);
  };

  // Logout function to remove tokens from cookies and update authentication state
  const callRefreshToken = useCallback(async () => {
    try {
      const refreshTokenResponse = await refreshToken();
      console.log("refreshTokenResponse", refreshTokenResponse);
      if (refreshTokenResponse.statusCode === 200) {
        console.log("refreshTokenResponse data", refreshTokenResponse.data);
        //setUser(refreshTokenResponse.data.data); // Assuming the API returns user data
        //setIsAuthenticated(true);
        login(
          refreshTokenResponse.data.accessToken,
          refreshTokenResponse.data.refreshToken
        );
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [login]);


  useEffect(() => {
    try {
      console.log("useEffect AuthContext Refresh Page");
      const accessToken = Cookies.get("accessToken");
      const refreshToken = Cookies.get("refreshToken");
      if (accessToken && refreshToken) {
        console.log("accessToken and refreshToken are present");
        callCheckAuth();
      } else if (refreshToken) {
        // refresh token is present, but access token is not'
        // Call the API to refresh the access token
        console.log("accessToken expired, refreshing...");
        callRefreshToken();
      } else {
        // If no tokens are found, set authentication state to false
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error(error);
      //setIsAuthenticated(false);
      //setUser(null);
    }
  }, [callCheckAuth, callRefreshToken]);



  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      login,
      logout,
      user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);