// Centralized messages for the application
export const messages = {
    login: {
        // Error message for incorrect email or password
        incorrectEmailPassword: "メールアドレスまたはパスワードが間違っています",
        emailRequired: "メールアドレスを入力してください。",
        passwordRequired: "パスワードを入力してください。",
    },
    tour: {
        // Error message for tour not found
        notFound: "ツアーが見つかりません",
    },
    admin: {
       user:{
        errorEmail:"メールの形式が正しくありません。",
        requiredEmail:"メールアドレスを入力してください。",
        requiredName:"名前を入力してください。",
        requiredPassword:"パスワードを入力してください。",
        requiredPasswordConfirm:"パスワード(確認)を入力してください。",
        sameAsConfirmation: "パスワードとパスワード（確認用）が異なります。",
       }
    },
    guide: {
        notStart: 'Guide does not start, please wait...',
    },
};