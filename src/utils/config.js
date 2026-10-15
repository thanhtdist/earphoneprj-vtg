/**
 * Configuration file for the application
 * Contains all the necessary configuration settings for the app
 */
const Config = {
    /**
     * AWS Chime SDK Configuration
     */
    // Amazon Chime SDK app instance ARN
    appInstanceArn: "arn:aws:chime:us-east-1:647755634525:app-instance/1007fa5f-d281-43e6-ac7d-758a23201cc0",
    // Number of days before app instance user expires
    appInstanceUserExpirationDays: 1,
    // Number of days before a channel expires
    channelExpirationDays: 1,
    // AWS region for Chime SDK
    region: 'us-east-1',
    // Session ID for chat messaging
    sessionId: 'sessionChatVTG',
    // AWS credentials - use environment variables for security
    accessKeyId: process.env.REACT_APP_MY_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_MY_APP_AWS_SECRET_ACCESS_KEY,

    /**
     * Application URLs and Paths
     */
    // Base URL for API endpoints
    baseURL: 'https://main.d392h4ccc80hkj.amplifyapp.com',
    // Base path for the application
    subPath: '',
    // Path names for different user roles
    pathNames: {
        guide: '/guide',
        subGuide: '/sub-guide',
        viewer: '/viewer',
        user: '/admin',
        login: '/admin/login',
        registerUser: '/admin/register',
        tour: '/admin/tour',
        registerTour: '/admin/tour/register',
    },

    // Websocket URL for real-time translate audio
    webSocketURL: 'wss://tnmrusql0d.execute-api.us-east-1.amazonaws.com/prod',
    
    /**
     * Storage and Logging Configuration
     */
    // S3 bucket name for chat attachments
    attachmentBucketName: 'vtg-chat-attachments',
    // API Gateway endpoint for CloudWatch logging
    cloudWatchLogRestApiVTGRestApi: 'https://4ipuok618b.execute-api.us-east-1.amazonaws.com/prod/',
    // Number of days before cookies expire
    cookiesExpirationDays: 1,

    // Token expiration time in seconds
    tokenExpirationTime: 60 * 60 * 24, // 1 day in seconds
    // Refresh token expiration time in seconds
    refreshTokenExpirationTime: 60 * 60 * 24 * 7, // 7 days in seconds
    
    /**
     * AWS Cognito Configuration
     */
    // User Pool ID
    userPoolId: process.env.REACT_APP_AWS_USER_POOL_ID,
    // User Pool Client ID
    userPoolClientId: process.env.REACT_APP_AWS_USER_POOL_CLIENT_ID,
    // Identity Pool ID
    identityPoolId: process.env.REACT_APP_AWS_IDENTITY_POOL_ID,

    cognitoEmail: process.env.REACT_APP_COGNITO_EMAIL,
    cognitoPassword: process.env.REACT_APP_COGNITO_PASSWORD,
    
    /**
     * Helper methods to construct application URLs
     */
    // Returns the full URL for the guide interface
    appGuideURL: function() {
        return `${this.baseURL}${this.subPath}${this.pathNames.guide}`;
    },
    // Returns the full URL for the sub-guide interface
    appSubGuideURL: function() {
        return `${this.baseURL}${this.subPath}${this.pathNames.subGuide}`;
    },
    // Returns the full URL for the viewer interface
    appViewerURL: function() {
        return `${this.baseURL}${this.subPath}${this.pathNames.viewer}`;
    }
};
export default Config;
