import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation } from 'react-router-dom';
import Cookies from "js-cookie";
import {
  checkAuth,
  refreshToken
} from '../../../apis/admin';
import Config from '../../../utils/config'; // Importing the configuration file

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(undefined); // Initialize user state
  const location = useLocation();

  const callCheckAuth = useCallback(async () => {
    try {
      const checkAuthResponse = await checkAuth();
      console.log("checkAuthResponse", checkAuthResponse);
      if (checkAuthResponse.statusCode === 200) {
        setUser(checkAuthResponse.data); // Assuming the API returns user data
        setIsAuthenticated(true);
        return true;
      } else {
        setUser(null); // Set user to null if authentication fails
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      setUser(null); // Set user to null if an error occurs
      setIsAuthenticated(false);
      return false;
    }
  }, []);

  // Login function to set tokens in cookies and update authentication state
  // This function is called after successful login to set the tokens in cookies
  const login = useCallback(async (accessToken, refreshToken) => {
    Cookies.set("accessToken", accessToken, { expires: 1 / (60 * 24) });
    Cookies.set("refreshToken", refreshToken, { expires: 7 });

    const success = await callCheckAuth();
    if (!success) {
      console.warn("Login failed after setting tokens.");
    }
  }, [callCheckAuth]);


  // Logout function to remove tokens from cookies and update authentication state
  const logout = () => {
    Cookies.remove("accessToken");
    Cookies.remove("refreshToken");
    setIsAuthenticated(false);
    setUser(null);
  };

  // Logout function to remove tokens from cookies and update authentication state
  const callRefreshToken = useCallback(async () => {
    try {
      const refreshTokenResponse = await refreshToken();
      console.log("refreshTokenResponse", refreshTokenResponse);
      if (refreshTokenResponse.statusCode === 200) {
        console.log("refreshTokenResponse data", refreshTokenResponse.data);
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

  // Check authentication status on component mount
  useEffect(() => {
    // Skip authentication check if on the login page
    console.log("location.pathname", location.pathname);
    if (location.pathname === Config.pathNames.login) return;
    
    const checkAuthStatus = async () => {
      const accessToken = Cookies.get("accessToken");
      const refreshToken = Cookies.get("refreshToken");
      if (accessToken && refreshToken) {
        console.log("accessToken and refreshToken are present");
        await callCheckAuth();
      } else if (refreshToken) {
        console.log("accessToken expired, refreshing...");
        await callRefreshToken();
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    };

    checkAuthStatus();
  }, [location.pathname, callCheckAuth, callRefreshToken]);

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