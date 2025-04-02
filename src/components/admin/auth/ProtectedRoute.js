import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";
import Loading from '../../Loading';

const ProtectedRoute = ({ element }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  // console.log("ProtectedRoute isAuthenticated", isAuthenticated);
  // console.log("ProtectedRoute user", user);
  // return isAuthenticated ? element : <Navigate to="/admin/login" replace />;
  useEffect(() => {
    console.log("AdminLayout useEffect user", user);
    if (user !== undefined) {
      setIsLoading(false);
      if (user === null) {
        window.location.href = "/admin/login";
      }
    }
  }, [user]);

  if (isLoading) {
    return <Loading />; // Show loading spinner while checking authentication
  }
  return user ? element : <Navigate to="/admin/login" replace />;
};

export default ProtectedRoute;
