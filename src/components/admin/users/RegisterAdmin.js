import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import {
    createUser
} from '../../../apis/admin';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import Sidebar from '../common/Sidebar';
import { toast } from 'react-toastify';
import Loading from '../../Loading';
import Config from '../../../utils/config'; // Importing the configuration file
import { messages } from '../../../messages';
import { EMAIL_FORMAT } from '../../../utils/constant'; // Importing the email format regex

const RegisterAdmin = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm();

    const onSubmit = (data) => {
        console.log(data);
        handleRegisterAdmin(data);
    };

    const handleRegisterAdmin = async (data) => {
        try {
            setIsLoading(true);
            const registerResponse = await createUser(data);
            console.log("result registerResponse", registerResponse);

            toast.success(`Admin was created successfully.`, {
                onClose: () => {
                    navigate(Config.pathNames.user); // Redirect to admin list page after registration
                },
            });

        } catch (error) {
            setIsLoading(false);
            toast.error(error.message || JSON.stringify(error));
            console.log("error Register response ", error);
        }

    }

    return (
        <div className="container-fluid">
            <div className="row py-4"></div>
            {/* <div id="sidebar"></div> */}
            <Sidebar />
            {/* <nav></nav> */}
            <main className="px-4 px-sm-5 my-2">
                <h1>管理者登録</h1>
                <div className="col-8 mx-auto mt-5 p-5 bg-white">
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="form-group row mb-3">
                            <label htmlFor="userName" className="col-sm-3 col-form-label">名前</label>
                            <div className="col-sm-9">
                                <input
                                    type="text"
                                    className="form-control"
                                    id="userName"
                                    placeholder="名前を入力"
                                    {...register("userName", { required: messages.admin.user.requiredName })} // Using centralized messages
                                ></input>
                                {errors.userName && <p style={{ color: "red" }}>{errors.userName.message}</p>}
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="email" className="col-sm-3 col-form-label">メールアドレス</label>
                            <div className="col-sm-9">
                                <input
                                    type="text"
                                    className="form-control"
                                    id="email"
                                    placeholder="メールアドレスを入力"
                                    {...register("email", {
                                        required: messages.admin.user.requiredEmail, // Using centralized messages
                                        pattern: {
                                            value: EMAIL_FORMAT,
                                            message: messages.admin.user.errorEmail
                                        }
                                    })}
                                ></input>
                                {errors.email && <p style={{ color: "red" }}>{errors.email.message}</p>}
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="password" className="col-sm-3 col-form-label">パスワード</label>
                            <div className="col-sm-9">
                                <input
                                    type="password" className="form-control" id="password" placeholder="パスワードを入力"
                                    {...register("password", { required: messages.admin.user.requiredPassword })} // Using centralized messages
                                ></input>
                                {errors.password && <p style={{ color: "red" }}>{errors.password.message}</p>}
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label className="col-sm-3 col-form-label">パスワード(確認)</label>
                            <div className="col-sm-9">
                                <input
                                    type="password" className="form-control" id="InputConfirmPassword" placeholder="パスワードを入力"
                                    {...register("inputConfirmPassword", {
                                        required: messages.admin.user.requiredPasswordConfirm, // Using centralized messages
                                        validate: {
                                            sameAsConfirmation: value => value === watch('password') || messages.admin.user.sameAsConfirmation // Using centralized messages,
                                        }
                                    })}
                                ></input>

                                {errors.inputConfirmPassword && <p style={{ color: "red" }}>{errors.inputConfirmPassword.message}</p>}
                            </div>
                        </div>
                        <div className="text-center mt-5">
                            <Link to={`${Config.pathNames.user}`} type="submit" className="btn btn-outline-danger" style={{ "marginRight": "50px" }}>戻る</Link>
                            <button type="submit" className="btn btn-danger">登録</button>
                        </div>
                    </form>
                </div>
            </main>
            {isLoading && <Loading />}
        </div >
    );
};

export default RegisterAdmin;