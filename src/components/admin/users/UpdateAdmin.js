import { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import Sidebar from '../common/Sidebar';
import { getDetailAdmin, updateAdmin } from '../../../apis/admin';
import { useParams } from "react-router-dom";
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import Loading from '../../Loading';
import Config from '../../../utils/config'; // Importing the configuration file

const UpdateAdmin = () => {
    const navigate = useNavigate();
    const { userId } = useParams(); // Extracts 'tourId' from the URL
    console.log("userId: ", userId);
    const [admin, setAdmin] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm();
    const onSubmit = (data) => {       
        handleUpdateAdmin(data);
    };

    //function update infomation of admin
    const handleUpdateAdmin = async (data) => {
        try {
            setIsLoading(true);
            const updateResponse = await updateAdmin(data);
            console.log("Call API update success:", updateResponse);
            toast.success(`User ${admin.userName} was updated successfully.`, {
                onClose: () => {
                    navigate(Config.pathNames.user); // Redirect to admin list page after update
                },
            });
            setIsLoading(false);
            setAdmin(updateResponse);
        } catch (error) {
            // console.error("Call API update false:", error);
            alert("Call API update false:", error);
        }
    }

    useEffect(() => {
        const handleGetDetailAdmin = async () => {
            try {
                setIsLoading(true);
                const getDetailResponse = await getDetailAdmin(userId);
                setAdmin(getDetailResponse);
                setIsLoading(false);
            } catch (error) {
                // console.error("Call API get detail false:", error);
                alert("Call API get detail false:", error);
            }
        }
        handleGetDetailAdmin();
    }, [userId]);
    useEffect(() => {
        if (admin) {
            const { password, ...rest } = admin; // Remove password
            reset(rest);
        }
    }, [admin, reset]);
    return (
        <>
            <div className="container-fluid">
                <div className="row py-4"></div>
                {/* <div id="sidebar"></div> */}
                <Sidebar />
                <nav></nav>
                <main className="px-4 px-sm-5 my-2">
                    <h1>管理者詳細</h1>
                    <div className="col-8 mx-auto mt-5 p-5 bg-white">
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="form-group row mb-3">
                                <label htmlFor="inputName" className="col-sm-3 col-form-label">名前</label>
                                <div className="col-sm-9">
                                    <input type="name" className="form-control" id="inputName" defaultValue={admin.userName}
                                        {...register("userName", { required: "名前を入力してください。" })}
                                    />
                                    {errors.userName && <p style={{ color: "red" }}>{errors.userName.message}</p>}
                                </div>
                            </div>
                            <div className="form-group row mb-3">
                                <label htmlFor="inputEmail" className="col-sm-3 col-form-label">メールアドレス</label>
                                <div className="col-sm-9">
                                    <input type="email" className="form-control" id="inputEmail" defaultValue={admin.email} disabled 
                                    {...register("email", {})}
                                    />
                                </div>
                            </div>
                            <div className="form-group row mb-3">
                                <label htmlFor="inputPassword" className="col-sm-3 col-form-label">パスワード</label>
                                <div className="col-sm-9">
                                    <input type="password" className="form-control" id="InputPassword"
                                        {...register("password", )}
                                    />
                                    {errors.password && <p style={{ color: "red" }}>{errors.password.message}</p>}
                                </div>
                            </div>
                            <div className="form-group row mb-3">
                                <label htmlFor="inputPasswordConfirm" className="col-sm-3 col-form-label">パスワード(確認)</label>
                                <div className="col-sm-9">
                                    <input type="password" className="form-control" id="InputPasswordConfirm"
                                        {...register("passwordConfirm", {
                                            // required: "パスワード(確認)を入力してください。",
                                            validate: {
                                                sameAsConfirmation: value => value === watch('password') || 'パスワードとパスワード（確認用）が異なります。',
                                            }
                                        })}
                                    />
                                    {errors.passwordConfirm && <p style={{ color: "red" }}>{errors.passwordConfirm.message}</p>}
                                </div>
                            </div>
                            <div className="text-center mt-5">
                                <Link to={`${Config.pathNames.user}`} type="submit" className="btn btn-outline-danger" style={{ "marginRight": "50px" }}>戻る</Link>
                                <button type="submit" className="btn btn-danger">更新</button>
                            </div>
                        </form>
                    </div>
                    {isLoading && <Loading />}
                </main>
            </div>

        </>
    );
};

export default UpdateAdmin;