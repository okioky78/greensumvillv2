import crypto from "crypto";
import { google } from "googleapis";
import {
  createHttpError,
  getAppOrigin,
  getRequestCookies,
  parseCookies,
  serializeCookie,
} from "../shared/http.js";

export const OAUTH_SESSION_COOKIE = "greensum_oauth_session";
export const OAUTH_STATE_COOKIE = "greensum_oauth_state";
export const OPENID_SCOPE = "openid";
export const EMAIL_SCOPE = "email";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const STATE_MAX_AGE_SECONDS = 60 * 10;
const TOKEN_REFRESH_SKEW_MS = 60 * 1000;

const usesSecureOrigin = () => {
  if (process.env.NETLIFY_DEV === "true") return false;

  const firstConfiguredOrigin = (process.env.APP_ORIGIN || "").split(",")[0]?.trim();
  const origin = firstConfiguredOrigin || process.env.URL || "";

  return origin.startsWith("https://");
};

export const getOAuthConfig = () => {
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

const getEncryptionKey = (secret) => crypto.createHash("sha256").update(secret).digest();

const encryptSession = (session, secret) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
};

const decryptSession = (value, secret) => {
  if (!value) return null;

  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v1" || !ivValue || !tagValue || !encryptedValue) return null;

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(secret),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8"));
};

const createCookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: usesSecureOrigin(),
  sameSite: "Lax",
  path: "/",
  maxAge,
});

export const createStateCookie = (state) =>
  serializeCookie(OAUTH_STATE_COOKIE, state, createCookieOptions(STATE_MAX_AGE_SECONDS));

export const createSessionCookie = (session, config = getOAuthConfig()) =>
  serializeCookie(
    OAUTH_SESSION_COOKIE,
    encryptSession(session, config.cookieSecret),
    createCookieOptions(SESSION_MAX_AGE_SECONDS),
  );

export const clearOAuthCookie = (name) =>
  serializeCookie(name, "", {
    httpOnly: true,
    secure: usesSecureOrigin(),
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
  });

export const createOAuthStart = () => {
  const config = getOAuthConfig();
  const oauth2Client = createOAuth2Client(config);
  const state = crypto.randomBytes(32).toString("base64url");
  const authorizationUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: true,
    scope: [OPENID_SCOPE, EMAIL_SCOPE, DRIVE_SCOPE],
    state,
  });

  return {
    authorizationUrl,
    stateCookie: createStateCookie(state),
  };
};

export const readOAuthSession = (event, config = getOAuthConfig()) => {
  const cookies = getRequestCookies(event);

  try {
    return decryptSession(cookies[OAUTH_SESSION_COOKIE], config.cookieSecret);
  } catch {
    return null;
  }
};

const createSessionUserFromIdToken = async (oauth2Client, idToken, config) => {
  if (!idToken) {
    throw createHttpError("Google ID token이 없습니다. 다시 로그인해 주세요.", 401, "MISSING_ID_TOKEN");
  }

  const ticket = await oauth2Client.verifyIdToken({
    idToken,
    audience: config.clientId,
  });
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw createHttpError("Google 로그인 사용자 정보를 확인하지 못했습니다.", 401, "INVALID_ID_TOKEN");
  }

  return {
    googleSubject: payload.sub,
    email: payload.email,
    name: payload.name || "",
  };
};

export const createOAuthSessionFromCallback = async (event) => {
  const config = getOAuthConfig();
  const params = event.queryStringParameters || {};
  const cookies = parseCookies(event.headers?.cookie || event.headers?.Cookie || "");
  const expectedState = cookies[OAUTH_STATE_COOKIE];

  if (params.error) {
    throw createHttpError(`Google 로그인이 취소되었습니다: ${params.error}`, 400, "OAUTH_DENIED");
  }

  if (!params.state || !expectedState || params.state !== expectedState) {
    throw createHttpError("OAuth state가 일치하지 않습니다.", 400, "INVALID_OAUTH_STATE");
  }

  if (!params.code) {
    throw createHttpError("OAuth authorization code가 없습니다.", 400, "MISSING_AUTH_CODE");
  }

  const oauth2Client = createOAuth2Client(config);
  const { tokens } = await oauth2Client.getToken(params.code);
  const user = await createSessionUserFromIdToken(oauth2Client, tokens.id_token, config);
  const previousSession = readOAuthSession(event, config);
  const previousRefreshToken =
    previousSession?.user?.googleSubject === user.googleSubject
      ? previousSession?.tokens?.refresh_token
      : null;
  const refreshToken = tokens.refresh_token || previousRefreshToken;

  if (!refreshToken) {
    throw createHttpError("Google 동의 화면을 통해 다시 로그인해 주세요.", 401, "MISSING_REFRESH_TOKEN");
  }

  return {
    createdAt: Date.now(),
    updatedAt: Date.now(),
    user,
    tokens: {
      access_token: tokens.access_token,
      refresh_token: refreshToken,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      token_type: tokens.token_type,
    },
  };
};

export const getAuthenticatedOAuthClient = async (event) => {
  const config = getOAuthConfig();
  const session = readOAuthSession(event, config);
  const storedTokens = session?.tokens;

  if (!storedTokens?.refresh_token) {
    throw createHttpError("Google 로그인이 필요합니다.", 401, "AUTH_REQUIRED");
  }

  if (!session?.user?.googleSubject) {
    throw createHttpError(
      "Google 로그인 사용자 정보가 없습니다. 다시 로그인해 주세요.",
      401,
      "MISSING_GOOGLE_IDENTITY",
    );
  }

  const oauth2Client = createOAuth2Client(config);
  let refreshedTokens = null;

  oauth2Client.on("tokens", (nextTokens) => {
    refreshedTokens = {
      ...storedTokens,
      ...nextTokens,
      refresh_token: nextTokens.refresh_token || storedTokens.refresh_token,
    };
  });

  oauth2Client.setCredentials(storedTokens);

  try {
    const expiryDate = storedTokens.expiry_date || 0;
    if (expiryDate <= Date.now() + TOKEN_REFRESH_SKEW_MS) {
      await oauth2Client.getAccessToken();
    }
  } catch (error) {
    error.clearSessionCookie = clearOAuthCookie(OAUTH_SESSION_COOKIE);
    throw createHttpError("Google 세션이 만료되었습니다. 다시 로그인해 주세요.", 401, "SESSION_REFRESH_FAILED");
  }

  const setCookie = refreshedTokens
    ? createSessionCookie({
        ...session,
        updatedAt: Date.now(),
        tokens: refreshedTokens,
      }, config)
    : null;

  return { oauth2Client, session, setCookie };
};

export const getAuthRedirectUrl = (query = "") => {
  const appOrigin = getAppOrigin();
  return `${appOrigin}/${query ? `?${query}` : ""}`;
};
