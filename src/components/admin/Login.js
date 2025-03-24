import React from 'react';
import { useForm } from 'react-hook-form';

const Login = () => {
    const {
        register,
        handleSubmit,
        // watch,
        formState: { errors },
    } = useForm();

    const onSubmit = (data) => {
        console.log(data);
        // handleRegisterAdmin(data);

    };
    return (
        <div class="login">
            <h1 class="text-center">VTG Admin</h1>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div class="mb-3">
                    <label htmlFor="LoginId" class="form-label">ID</label>
                    <input type="id" class="form-control" id="LoginId" placeholder="IDを入力"
                     {...register("userName", { required: "名前を入力してください。" })}
                    ></input>
                    {errors.userName && <p style={{ color: "red" }}>{errors.userName.message}</p>}
                </div>
                <div class="mb-3">
                    <label for="InputPassword" class="form-label">パスワード</label>
                    <input type="password" class="form-control" id="InputPassword" placeholder="パスワードを入力"></input>
                </div>
                <div class="mb-3 forgot">
                    <a href="forgot_password.html">パスワードを忘れた方はこちら</a>
                </div>
                <button type="submit" class="btn btn-danger">ログイン</button>
                <a href="manager_list.html">管理画面に入る</a>
            </form>
        </div>
    );
};

export default Login;