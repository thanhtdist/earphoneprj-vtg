/**
 * Configuration for the AWS Lambda functions
 */

import { DB_TABLES, DEFAULT_HEADERS } from './constant';
console.log('App DB_TABLES:', DB_TABLES);
console.log('App DEFAULT_HEADERS:', DEFAULT_HEADERS);

export const Config = {
    // region for the AWS SDK
    // ap-northeast-2: Asia Pacific (Seoul)
    // ap-southeast-1: Asia Pacific (Singapore)
    // ap-east-1: Asia Pacific (Hong Kong)
    // us-east-1: US East (N. Virginia)
    // ap-northeast-1: Asia Pacific (Tokyo)
    region: 'ap-northeast-1',
    messageRegion: 'us-east-1',
    // The API Gateway endpoint for the API
    headers: DEFAULT_HEADERS,
    // Chime SDK Messaging app instance - must match src/utils/config.js (appInstanceArn).
    // Used by update-meeting-by-tourid when it creates the tour's meeting/channel server-side.
    appInstanceArn: 'arn:aws:chime:us-east-1:647755634525:app-instance/1007fa5f-d281-43e6-ac7d-758a23201cc0',
    appInstanceUserExpirationDays: 1, // days before an app instance user expires
    channelExpirationDays: 1, // days before a channel expires
    jwtSecret: 'a5e3696b23ce9b6e96af822f26b757d52c64b9a8e29351b9fee039dfb2d35600', // Secret key for JWT signing and verification
    jwtExpiration: "15m", // Token expiration time
    refreshSecret: '5d37f522ddc137330c5f081a3dc9cd5f10263ece17915b1b0ebdde5c7ff7b5d977114edd1bb1e94b32d620c5552857937605c7ef6d01c1ad9a5e5b15679b253f', // Secret key for refresh token signing and verification
    refreshExpiration: '7d', // Refresh token expiration time
    attachmentBucketName: 'vtg-chat-attachments', // S3 bucket name for attachments
    dbTables: DB_TABLES,
    cognitoUserPoolId: 'us-east-1_bO6Ov9c8u', // Cognito User Pool ID
    cognitoClientId: '66746hij9gar727r0mqrhhjbpj', // Cognito App Client ID
    identityPoolId: 'us-east-1:82ce29b3-5ab3-439b-b857-576f3b333a9b', // Cognito Identity Pool ID
    // Fixed credentials for Cognito login
    //cognitoEmail: 'thanhtd@i-stech.net',
    //cognitoPassword: '123456789@Xx', 
    cognitoEmail: process.env.COGNITO_EMAIL || ``,
    cognitoPassword: process.env.COGNITO_PASSWORD || ``, 
    privateKey: process.env.PRIVATE_KEY || ``,
    cloudFrontKeyPairId: 'KM5PK06K9XZUQ', // CloudFront Key Pair ID
    cloudFrontDomain: 'https://d8d9ccu87krcw.cloudfront.net', // CloudFront domain for signed URLs
    viewPresignedS3UrlExpiration: 3 * 60 * 60 * 1000, // 3 hours in milliseconds
    uploadPresignedS3Expiration: 60 * 5, // 5 minutes in milliseconds
    // .jpg, .jpeg, .png, .gif, .pdf, .mp3, .mp4 (audio), .m4a, .aac, .wav
    allowedFileTypes: [
        'image/jpeg', 'image/png', 'image/gif', 'application/pdf',
        'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav',
    ], // Allowed file types for upload (shared by chat attachments and the guide "Play voice" upload)
};