// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

// import data from './backend/serverless/appconfig.json'
// const appConfigJson = Object.assign({}, ...data.map((x) => ({[x.OutputKey]: x.OutputValue})));

// const appConfig = {
//     apiGatewayInvokeUrl: '' || appConfigJson.apiGatewayInvokeUrl,
//     cognitoUserPoolId: '' || appConfigJson.cognitoUserPoolId,
//     cognitoAppClientId: '' || appConfigJson.cognitoAppClientId,
//     cognitoIdentityPoolId: '' || appConfigJson.cognitoIdentityPoolId,
//     appInstanceArn: '' || appConfigJson.appInstanceArn,
//     region: 'us-east-1',  // Only supported region for Amazon Chime SDK Messaging as of this writing
//     attachments_s3_bucket_name: '' || appConfigJson.attachmentsS3BucketName
// };
const appConfig = {
    // apiGatewayInvokeUrl: 'https://m6g4xek2qi.execute-api.us-east-1.amazonaws.com/prod/',
    // cognitoUserPoolId: 'us-east-1_AIGUmkbnz',
    // cognitoAppClientId: '2pqf5i97f01k32n7jvpu5qstcu',
    // cognitoIdentityPoolId: 'us-east-1:15af4e39-9929-4d34-9f8a-81015764af1b',
    //arn:aws:chime:region: aws_account_id:app-instance/app_instance_id
    //appInstanceArn: 'arn:aws:chime:us-east-1:647755634525:app-instance/c2c1ab2b-42d1-4f12-b99f-14e231ebe958',
    //arn:aws:chime:us-east-1:647755634525:app-instance/dec63f1a-bff4-48f9-a75e-2575ca8036a9
    appInstanceArn: 'arn:aws:chime:us-east-1:647755634525:app-instance/dec63f1a-bff4-48f9-a75e-2575ca8036a9',
    region: 'us-east-1',  // Only supported region for Amazon Chime SDK Messaging as of this writing
    // attachments_s3_bucket_name: 'my-demo-stack-chatattachmentsbucket-lr6qxxm7k9rs',
    // assetsS3BucketName: 'my-demo-stack-s3bucketforassets-tysgspe8pkz2',
    //process.env.REACT_APP_MY_APP_AWS_ACCESS_KEY_ID
    //process.env.REACT_APP_MY_APP_AWS_SECRET_ACCESS_KEY
    sessionId: 'sessiondemo',
    // accessKeyId: '',
    // secretAccessKey: '',
    accessKeyId: process.env.REACT_APP_MY_APP_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.REACT_APP_MY_APP_AWS_SECRET_ACCESS_KEY,
    HostIDTest: 'e45834d8-8081-7080-3c1b-cb836aee5aa6',
    ListenerIDTest: 'a4c894e8-c021-7097-8ff0-f639dca1f3fb',
};
export default appConfig;
