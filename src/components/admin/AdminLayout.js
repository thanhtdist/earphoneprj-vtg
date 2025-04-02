// components/admin/AdminLayout.js
import React, {
    useState,
    useEffect
} from 'react';
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext"; // Importing the authentication context
import Loading from '../Loading';
import { FiLogOut } from "react-icons/fi";
import { FaUserCircle } from "react-icons/fa";
const AdminLayout = () => {
    const navigate = useNavigate();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const {
        //isAuthenticated,
        user,
        logout } = useAuth();

    const [isLoading, setIsLoading] = useState(true);
    //const [isLoading, setIsLoading] = useState(false);
    // const [error, setError] = useState(null);

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


    // useEffect(() => {
    //     // Check if the user is authenticated when the component mounts
    //     //If not, redirect to the login page
    //     if (!isAuthenticated) {
    //         navigate("/admin/login");
    //     }
    // }, [navigate, isAuthenticated]); // Empty dependency array to run only on mount
    // const callCheckAuth = async () => {

    const handleLogout = () => {
        // Clear session (adjust based on your authentication logic)y
        // document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        logout(); // Call the logout function from AuthContext
        // Optionally, you can clear any other session data here
        navigate("/admin/login"); // Redirect to login page
    };

    console.log("AdminLayout user", user);

    return (
        <div className="p-4">
            <header
                className="flex justify-between items-center bg-gray-800 text-white p-4"
                style={{ float: "right" }}
            >
                <div className="relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center space-x-2 border-none bg-transparent focus:outline-none"
                        style={{
                            border: "none",
                            background: "transparent"
                        }}
                    >
                        <FaUserCircle size={20} />
                        <span style={{ marginLeft: "5px" }}>
                            {user?.userName}
                        </span>
                    </button>
                    {showUserMenu && (
                        <div className="mt-2">
                            <button
                                onClick={handleLogout}
                                style={{
                                    border: "none",
                                    background: "transparent"
                                }}
                            >
                                <FiLogOut />
                                <span style={{ marginLeft: "5px" }}>
                                    Log out
                                </span>
                            </button>
                        </div>
                    )}
                </div>
            </header>
            <main className="mt-4">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
