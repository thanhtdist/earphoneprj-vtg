import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
//import { useNavigate } from "react-router-dom";
import {
    loginAdmin
} from '../../apis/admin';
import Loading from '../Loading';
import { messages } from '../../messages';
import { useAuth } from "../admin/auth/AuthContext";

const Login = () => {
    const { login, logout, isAuthenticated } = useAuth();
    //const navigate = useNavigate();
    const {
        register,
        handleSubmit,
        // watch,
        formState: { errors },
    } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = React.useState(null);

    // Handle form submission email and password
    const onSubmit = (data) => {
        console.log(data);
        //alert(JSON.stringify(data, null, 2)); // Display form data in an alert
        callLoginAdmin(data);
    };

    // call loginAdmin function
    const callLoginAdmin = async (data) => {
        try {
            setIsLoading(true);
            const loginAdminResponse = await loginAdmin(data);
            console.log("loginAdminResponse", loginAdminResponse);
            if (loginAdminResponse.statusCode === 200) {
                // Remove cookies if they exist
                logout();
                // Set new cookies with the new tokens
                login(loginAdminResponse.data.accessToken, loginAdminResponse.data.refreshToken);
                //console.log("login tesst", tesst);
               // navigate("/admin/tour");
                //window.location.href = "/admin/tour";

                console.log("Login isAuthenticated", isAuthenticated);
            } else {
                setError(messages.login.incorrectEmailPassword);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {isLoading && <Loading />}
            <div className="login">
                <h1 className="text-center">VTG Admin</h1>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="mb-3">
                        <label htmlFor="Email" className="form-label">メールアドレス</label>
                        <input type="email" className="form-control" id="Email" placeholder="メールアドレスを入力"
                            {...register("email", { required: "メールアドレスを選択してください。" })}
                        ></input>
                        {errors.email && <p style={{ color: "red" }}>{errors.email.message}</p>}
                    </div>
                    <div className="mb-3">
                        <label htmlFor="InputPassword" className="form-label">パスワード</label>
                        <input type="password" className="form-control" id="InputPassword" placeholder="パスワードを入力"
                            {...register("password", { required: "パスワードを選択してください。" })}
                        ></input>
                        {errors.password && <p style={{ color: "red" }}>{errors.password.message}</p>}
                    </div>
                    {error && <p style={{ color: "red" }}>{error}</p>}
                    <button type="submit" className="btn btn-danger">ログイン</button>
                </form>
            </div>
        </>
    );
};

export default Login;