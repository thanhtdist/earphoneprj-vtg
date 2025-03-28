import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ element }) => {
  const { isAuthenticated } = useAuth();
  console.log("isAuthenticated", isAuthenticated);
  return isAuthenticated ? element : <Navigate to="/admin/login" replace />;
};

export default ProtectedRoute;
