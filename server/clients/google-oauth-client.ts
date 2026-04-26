import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import { createHttpError } from "../shared/http.ts";
import { withUpstreamTimeout } from "../shared/upstream.ts";

export const OPENID_SCOPE = "openid";
export const EMAIL_SCOPE = "email";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  cookieSecret: string;
}

export const getOAuthConfig = (): OAuthConfig => {
  const clientId = (process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || "").trim();
  const redirectUri = (process.env.GOOGLE_OAUTH_REDIRECT_URI || "").trim();
  const cookieSecret = (process.env.GOOGLE_OAUTH_COOKIE_SECRET || "").trim();

  if (!clientId || !clientSecret || !redirectUri || !cookieSecret) {
    throw createHttpError(
      "Google OAuth 설정이 누락되었습니다. GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI, GOOGLE_OAUTH_COOKIE_SECRET를 확인해 주세요.",
      500,
      "MISSING_OAUTH_CONFIG",
    );
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    cookieSecret,
  };
};

export const createOAuth2Client = (config = getOAuthConfig()) =>
  new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);

export const createGoogleAuthorizationUrl = (
  oauth2Client: OAuth2Client,
  state: string,
) =>
  oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [OPENID_SCOPE, EMAIL_SCOPE, DRIVE_SCOPE],
    state,
  });

export const exchangeGoogleAuthCode = (oauth2Client: OAuth2Client, code: string) =>
  withGoogleAuthTimeout(oauth2Client.getToken(code));

export const verifyGoogleIdToken = (
  oauth2Client: OAuth2Client,
  idToken: string,
  audience: string,
) =>
  withGoogleAuthTimeout(
    oauth2Client.verifyIdToken({
      idToken,
      audience,
    }),
  );

export const refreshGoogleAccessToken = (oauth2Client: OAuth2Client) =>
  withGoogleAuthTimeout(oauth2Client.getAccessToken());

const withGoogleAuthTimeout = <T>(operation: Promise<T>) =>
  withUpstreamTimeout(operation, {
    message: "Google 인증 응답 시간이 초과되었습니다.",
    code: "GOOGLE_AUTH_TIMEOUT",
  });
