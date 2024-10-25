/**
 * Configuration for the AWS Lambda functions
 */
export const Config = {
    // region for the AWS SDK
    region: 'us-east-1',
    // The API Gateway endpoint for the API
    headers: {
        'Content-Type': 'application/json', // The content type for API Gateway responses
        'Access-Control-Allow-Origin': '*', //  Enable CORS for all methods by allowing any origin
    }
};