import React, { useState } from 'react';

const ResetPassword = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }
        // Handle password reset logic here
        console.log('Password reset for:', email);
    };

    return (
        <div class="forgot-password">
        <div class="mb-4">
          <h1 class="mb-3">パスワードの再設定</h1>
          <p>登録されているメールアドレスに再設定用のURLをメールにてお送りいたします。</p>
        </div>
        <form>
          <div class="mb-3">
            <label for="Email" class="form-label">メールアドレス</label>
            <input type="Email" class="form-control" id="Email" placeholder="メールアドレスを入力"></input>
          </div>
          <button type="submit" class="btn btn-danger">送信</button>
        </form>
      </div>
    );
};

export default ResetPassword;