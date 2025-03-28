import { createContext, useContext, useState, useEffect } from "react";
// import {
//   checkAuth
// } from '../../../apis/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    //!!localStorage.getItem("token") // Example: Store auth token in localStorage
    //null
    true
  );

  useEffect(() => {
    const callCheckAuth = async () => {
      try {
        // const res = await fetch(" https://jmkfjlxu63.execute-api.us-east-1.amazonaws.com/prod/users/auth", {
        //   credentials: "include" // Sends HttpOnly cookie
        // });
        //console.log("checkAuthResponse", res);
        // const checkAuthResponse = await checkAuth();
        // console.log("checkAuthResponse", checkAuthResponse);
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    callCheckAuth();
  }, []);

  // const login = (token) => {
  //   localStorage.setItem("token", token);
  //   setIsAuthenticated(true);
  // };

  // const logout = () => {
  //   localStorage.removeItem("token");
  //   setIsAuthenticated(false);
  // };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      //login,
      //logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);