// This file contains the configuration for the app.
const Config = {
    // Apply for app instance for chat messaging
    appInstanceArn: "arn:aws:chime:us-east-1:647755634525:app-instance/1007fa5f-d281-43e6-ac7d-758a23201cc0",
    // Apply for app instance user and channel(group chat) for chat messaging
    appInstanceUserExpirationDays: 1,
    channelExpirationDays: 1,
    // Region for the Amazon Chime SDK
    region: 'us-east-1',
    // Session ID for the chat messaging
    sessionId: 'sessionChatVTG',
    // Access key and secret key of the AWS account to authenticate with the Amazon Chime SDK for chat messaging
    // accessKeyId: '',
    // secretAccessKey: '',
    accessKeyId: process.env.REACT_APP_MY_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_MY_APP_AWS_SECRET_ACCESS_KEY,
    // URL for the web app for participants to join listen to audio
    // appSubSpeakerURL: 'http://localhost:3000/sub-speaker/',
    // appViewerURL: 'http://localhost:3000/viewer/',
    appSubSpeakerURL: 'https://vtg.de8nhhup5aqyd.amplifyapp.com/sub-speaker/',
    appViewerURL: 'https://vtg.de8nhhup5aqyd.amplifyapp.com/viewer/',
    // S3 attchment bucket name
    attachmentBucketName: 'vtg-chat-attachments',
    // Write logs from client side to CloudWatch using API Gateway      
    cloudWatchLogRestApiVTGRestApi: 'https://4ipuok618b.execute-api.us-east-1.amazonaws.com/prod/'
};
export default Config;
