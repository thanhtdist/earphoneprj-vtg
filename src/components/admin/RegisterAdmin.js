import React from 'react';
import {
    createUser
} from '../../apis/admin';
import { useForm } from 'react-hook-form';
import Sidebar from './Sidebar';

const RegisterAdmin = () => {
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
            const registerResponse = await createUser(data);
            console.log("result registerResponse", registerResponse);
        } catch (error) {
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
                            <label htmlFor="inputName" className="col-sm-3 col-form-label">名前</label>
                            <div className="col-sm-9">
                                <input
                                    type="name"
                                    className="form-control"
                                    id="inputName"
                                    placeholder="名前を入力"
                                    {...register("userName", { required: "名前を入力してください。" })}
                                ></input>
                                {errors.inputName && <p style={{ color: "red" }}>{errors.inputName.message}</p>}
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="inputEmail" className="col-sm-3 col-form-label">メールアドレス</label>
                            <div className="col-sm-9">
                                <input
                                    type="email"
                                    className="form-control"
                                    id="inputEmail"
                                    placeholder="メールアドレスを入力"
                                    {...register("email", { required: "メールアドレスを入力してください。" })}
                                ></input>
                                {errors.inputEmail && <p style={{ color: "red" }}>{errors.inputEmail.message}</p>}
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label htmlFor="inputPassword" className="col-sm-3 col-form-label">パスワード</label>
                            <div className="col-sm-9">
                                <input
                                    type="password" className="form-control" id="InputPassword" placeholder="パスワードを入力"
                                    {...register("password", { required: "パスワードを入力してください。" })}
                                ></input>
                                {errors.inputPassword && <p style={{ color: "red" }}>{errors.inputPassword.message}</p>}
                            </div>
                        </div>
                        <div className="form-group row mb-3">
                            <label  className="col-sm-3 col-form-label">パスワード(確認)</label>
                            <div className="col-sm-9">
                                <input
                                    type="password" className="form-control" id="InputConfirmPassword" placeholder="パスワードを入力"
                                    {...register("inputConfirmPassword", { 
                                        required: "パスワード(確認)を入力してください。" ,
                                        validate: {
                                            sameAsConfirmation: value => value === watch('password') || 'パスワードとパスワード（確認用）が異なります。',
                                        }
                                    })}
                                ></input>
                              
                                {errors.inputConfirmPassword && <p style={{ color: "red" }}>{errors.inputConfirmPassword.message}</p>}
                            </div>
                        </div>
                        <div className="text-center mt-5">
                            <a href="/admin" type="button" className="btn btn-outline-danger" style={{marginRight:'50px'}}>戻る</a>
                            <button type="submit" className="btn btn-danger">登録</button>
                        </div>
                    </form>
                </div>
            </main>
        </div >
    );
};

export default RegisterAdmin;