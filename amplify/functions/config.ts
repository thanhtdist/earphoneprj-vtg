/**
 * Configuration for the AWS Lambda functions
 */
export const Config = {
    // region for the AWS SDK
    region: 'us-east-1',
    // The content type for API Gateway responses
    contentType: 'application/json',
    // Enable CORS for all methods by allowing any origin
    accessControlAllowOrigin: '*',
};