import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
// import { useLocation } from 'react-router-dom';
import { getDetailAdmin, updateAdmin } from '../../apis/api';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';

const UpdateAdmin = () => {
    const [searchParams] = useSearchParams();
    const userId = searchParams.get("userId");
    const [admin, setAdmin] = useState({});
    const {
        register,
        handleSubmit,
        watch,
        reset,
        formState: { errors },
    } = useForm();
    const onSubmit = (data) => {
        // console.log("cccccccc",data);
        handleUpdateAdmin(data);       
     };
   
    const handleUpdateAdmin = async (data) => {
        try {        
            const updateResponse = await updateAdmin(data);
            console.log("Call API update success:", updateResponse);
            setAdmin(updateResponse);
            window.location.href = "/admin_list";
        } catch (error) {
            console.error("Call API update false:", error);
        }
    }

    useEffect(() => {
        const handleGetDetailAdmin = async () => {
            try {
                const getDetailResponse = await getDetailAdmin(userId);
                setAdmin(getDetailResponse);
            } catch (error) {
                console.error("Call API get detail false:", error);
            }
        }
        handleGetDetailAdmin();
    }, [userId]);
    useEffect(() => {
        if (admin) {
          reset(admin);
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
                                    <input type="email" className="form-control" id="inputEmail" defaultValue={admin.email} disabled/>                    
                                </div>
                            </div>
                            <div className="form-group row mb-3">
                                <label htmlFor="inputPassword" className="col-sm-3 col-form-label">パスワード</label>
                                <div className="col-sm-9">
                                    <input type="text" className="form-control" id="InputPassword" 
                                     {...register("password", { required: "パスワードを入力してください。" })}
                                    />
                                    {errors.password && <p style={{ color: "red" }}>{errors.password.message}</p>}
                                </div>
                            </div>
                            <div className="form-group row mb-3">
                                <label htmlFor="inputPasswordConfirm" className="col-sm-3 col-form-label">パスワード(確認)</label>
                                <div className="col-sm-9">
                                    <input type="text" className="form-control" id="InputPasswordConfirm" 
                                     {...register("passwordConfirm", { 
                                        required: "パスワード(確認)を入力してください。" ,
                                        validate: {
                                            sameAsConfirmation: value => value === watch('password') || 'パスワードとパスワード（確認用）が異なります。',
                                        }
                                     })}
                                    />
                                     {errors.passwordConfirm && <p style={{ color: "red" }}>{errors.passwordConfirm.message}</p>}
                                </div>
                            </div>
                            <div className="text-center mt-5">
                                <a href="manager_list.html" type="submit" className="btn btn-outline-danger" style={{ marginRight: '50px' }}>戻る</a>
                                <button type="submit" className="btn btn-danger">登録</button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>

        </>
    );
};

export default UpdateAdmin;