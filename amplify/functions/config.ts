/**
 * Configuration for the AWS Lambda functions
 */
export const Config = {
    // region for the AWS SDK
    // ap-northeast-2: Asia Pacific (Seoul)
    // ap-southeast-1: Asia Pacific (Singapore)
    // ap-east-1: Asia Pacific (Hong Kong)
    // us-east-1: US East (N. Virginia)
    // ap-northeast-1: Asia Pacific (Tokyo)
    region: 'ap-northeast-1', //ap-east-1
    message_region: 'us-east-1',
    // The API Gateway endpoint for the API
    headers: {
        'Content-Type': 'application/json', // The content type for API Gateway responses
       'Access-Control-Allow-Origin': '*', //  Enable CORS for all methods by allowing any origin
        //'Access-Control-Allow-Origin': 'execute-api.us-east-1.amazonaws.com', //  execute-api.us-east-1.amazonaws.com
        'Access-Control-Allow-Credentials': true // Allow credentials to be included in the request
    },
    jwtSecret: 'a5e3696b23ce9b6e96af822f26b757d52c64b9a8e29351b9fee039dfb2d35600', // Secret key for JWT signing and verification
    jwtExpiration: '15m', // Token expiration time
    refreshSecret: '5d37f522ddc137330c5f081a3dc9cd5f10263ece17915b1b0ebdde5c7ff7b5d977114edd1bb1e94b32d620c5552857937605c7ef6d01c1ad9a5e5b15679b253f', // Secret key for refresh token signing and verification
    refreshExpiration: '7d', // Refresh token expiration time
};