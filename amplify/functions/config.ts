// Define the configuration for the AWS Lambda functions
export const Config = {
    // region for the AWS SDK
    region: 'us-east-1',
    // content type for the API Gateway
    contentType : 'application/json',
    // Enable CORS for all methods
    accessControlAllowOrigin: '*',
};