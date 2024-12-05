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
    region: 'us-east-1', //ap-east-1
    message_region: 'us-east-1',
    // The API Gateway endpoint for the API
    headers: {
        'Content-Type': 'application/json', // The content type for API Gateway responses
        'Access-Control-Allow-Origin': '*', //  Enable CORS for all methods by allowing any origin
    }
};