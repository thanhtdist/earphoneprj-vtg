import type { APIGatewayProxyHandler } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';

import {
  CognitoIdentityClient,
  GetIdCommand,
  GetCredentialsForIdentityCommand,
} from '@aws-sdk/client-cognito-identity';

import { Config } from '@configs/config';

export const handler: APIGatewayProxyHandler = async (_event) => {
  const region = Config.messageRegion;
  const userPoolId = Config.cognitoUserPoolId;
  const clientId = Config.cognitoClientId;
  const identityPoolId = Config.identityPoolId;
  const email = Config.cognitoEmail; // fixed email
  const password = Config.cognitoPassword; // fixed password

  const cognitoProvider = new CognitoIdentityProviderClient({ region });
  const identityClient = new CognitoIdentityClient({ region });

  try {
    // Step 1: Login Cognito with fixed credentials
    const authCommand = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const authResponse = await cognitoProvider.send(authCommand);
    const idToken = authResponse.AuthenticationResult?.IdToken;

    if (!idToken) {
      throw new Error('Failed to get ID token from Cognito');
    }

    // Step 2: Get Cognito Identity ID
    const getIdCommand = new GetIdCommand({
      IdentityPoolId: identityPoolId,
      Logins: {
        [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: idToken,
      },
    });

    const { IdentityId } = await identityClient.send(getIdCommand);

    if (!IdentityId) {
      throw new Error('Failed to get Identity ID');
    }

    // Step 3: Get AWS credentials from Identity ID
    const credsCommand = new GetCredentialsForIdentityCommand({
      IdentityId,
      Logins: {
        [`cognito-idp.${region}.amazonaws.com/${userPoolId}`]: idToken,
      }
    });

    const credsResponse = await identityClient.send(credsCommand);
    const creds = credsResponse.Credentials;

    if (!creds) {
      throw new Error('Failed to get AWS credentials');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          accessKeyId: creds.AccessKeyId,
          secretAccessKey: creds.SecretKey,
          sessionToken: creds.SessionToken,
          identityId: IdentityId,
          expiration: creds.Expiration,
        },
        message: 'Cognito login successful and credentials fetched',
      }),
      headers: Config.headers,
    };
  } catch (error: any) {
    console.error('Error during Cognito login or credential fetch:', error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || 'Internal Server Error',
      }),
      headers: Config.headers,
    };
  }
};
