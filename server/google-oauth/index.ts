import crypto from "crypto";
import { google } from "googleapis";
import type { Credentials, OAuth2Client } from "google-auth-library";
import {
  createHttpError,
  getAppOrigin,
  getHeader,
  getRequestCookies,
  parseCookies,
  serializeCookie,
} from "../shared/http.ts";
import { withUpstreamTimeout } from "../shared/upstream.ts";
import type { NetlifyEvent } from "../shared/types.ts";

export const OAUTH_SESSION_COOKIE = "greensum_oauth_session";
export const OAUTH_STATE_COOKIE = "greensum_oauth_state";
export const OPENID_SCOPE = "openid";
export const EMAIL_SCOPE = "email";
export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const SESSION_ABSOLUTE_MAX_AGE_MS = 30 * DAY_MS;
const SESSION_IDLE_TIMEOUT_MS = 7 * DAY_MS;
const SESSION_TOUCH_INTERVAL_MS = 10 * 60 * 1000;
const STATE_MAX_AGE_SECONDS = 60 * 10;
const TOKEN_REFRESH_SKEW_MS = 60 * 1000;

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  cookieSecret: string;
}

export interface OAuthSessionUser {
  googleSubject: string;
  email: string;
  name: string;
}

export type OAuthSessionTokens = Credentials & {
  refresh_token: string;
};

export interface OAuthSession {
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number;
  user: OAuthSessionUser;
  tokens: OAuthSessionTokens;
}

export interface AuthenticatedOAuthContext {
  oauth2Client: OAuth2Client;
  session: OAuthSession;
  setCookie?: string;
}

const usesSecureOrigin = () => {
  if (process.env.NETLIFY_DEV === "true") return false;

  const firstConfiguredOrigin = (process.env.APP_ORIGIN || "").split(",")[0]?.trim();
  const origin = firstConfiguredOrigin || process.env.URL || "";

  return origin.startsWith("https://");
};

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

const getEncryptionKey = (secret: string) => crypto.createHash("sha256").update(secret).digest();

const encryptSession = (session: OAuthSession, secret: string) => {
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

const decryptSession = (value: string | undefined, secret: string): OAuthSession | null => {
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

  return JSON.parse(decrypted.toString("utf8")) as OAuthSession;
};

const createCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: usesSecureOrigin(),
  sameSite: "Lax" as const,
  path: "/",
  maxAge,
});

export const createStateCookie = (state: string) =>
  serializeCookie(OAUTH_STATE_COOKIE, state, createCookieOptions(STATE_MAX_AGE_SECONDS));

export const createSessionCookie = (session: OAuthSession, config = getOAuthConfig()) =>
  serializeCookie(
    OAUTH_SESSION_COOKIE,
    encryptSession(session, config.cookieSecret),
    createCookieOptions(SESSION_MAX_AGE_SECONDS),
  );

export const clearOAuthCookie = (name: string) =>
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

export const readOAuthSession = (event: NetlifyEvent, config = getOAuthConfig()) => {
  const cookies = getRequestCookies(event);

  try {
    return decryptSession(cookies[OAUTH_SESSION_COOKIE], config.cookieSecret);
  } catch {
    return null;
  }
};

const isValidTimestamp = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const getSessionLastUsedAt = (session: OAuthSession) => {
  if (isValidTimestamp(session.lastUsedAt)) return session.lastUsedAt;
  if (isValidTimestamp(session.updatedAt)) return session.updatedAt;
  return session.createdAt;
};

const createSessionExpiredError = (message: string, code: string) => {
  const error = createHttpError(message, 401, code);
  error.clearSessionCookie = clearOAuthCookie(OAUTH_SESSION_COOKIE);
  return error;
};

const validateSessionLifetime = (session: OAuthSession, now = Date.now()) => {
  if (!isValidTimestamp(session.createdAt)) {
    throw createSessionExpiredError(
      "Google 세션 정보를 확인할 수 없습니다. 다시 로그인해 주세요.",
      "INVALID_SESSION_CREATED_AT",
    );
  }

  if (now - session.createdAt > SESSION_ABSOLUTE_MAX_AGE_MS) {
    throw createSessionExpiredError(
      "Google 세션이 만료되었습니다. 다시 로그인해 주세요.",
      "SESSION_ABSOLUTE_EXPIRED",
    );
  }

  if (now - getSessionLastUsedAt(session) > SESSION_IDLE_TIMEOUT_MS) {
    throw createSessionExpiredError(
      "오랫동안 사용하지 않아 Google 세션이 만료되었습니다. 다시 로그인해 주세요.",
      "SESSION_IDLE_EXPIRED",
    );
  }
};

const shouldTouchSession = (session: OAuthSession, now = Date.now()) =>
  now - getSessionLastUsedAt(session) >= SESSION_TOUCH_INTERVAL_MS;

const createSessionUserFromIdToken = async (
  oauth2Client: OAuth2Client,
  idToken: string | null | undefined,
  config: OAuthConfig,
): Promise<OAuthSessionUser> => {
  if (!idToken) {
    throw createHttpError("Google ID token이 없습니다. 다시 로그인해 주세요.", 401, "MISSING_ID_TOKEN");
  }

  const ticket = await withGoogleAuthTimeout(
    oauth2Client.verifyIdToken({
      idToken,
      audience: config.clientId,
    }),
  );
  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email) {
    throw createHttpError(
      "Google 로그인 사용자 정보를 확인하지 못했습니다.",
      401,
      "INVALID_ID_TOKEN",
    );
  }

  return {
    googleSubject: payload.sub,
    email: payload.email,
    name: payload.name || "",
  };
};

export const createOAuthSessionFromCallback = async (
  event: NetlifyEvent,
): Promise<OAuthSession> => {
  const config = getOAuthConfig();
  const params = event.queryStringParameters || {};
  const cookies = parseCookies(getHeader(event.headers, "cookie"));
  const expectedState = cookies[OAUTH_STATE_COOKIE];

  if (params.error) {
    throw createHttpError(`Google 로그인이 취소되었습니다. ${params.error}`, 400, "OAUTH_DENIED");
  }

  if (!params.state || !expectedState || params.state !== expectedState) {
    throw createHttpError("OAuth state가 일치하지 않습니다.", 400, "INVALID_OAUTH_STATE");
  }

  if (!params.code) {
    throw createHttpError("OAuth authorization code가 없습니다.", 400, "MISSING_AUTH_CODE");
  }

  const oauth2Client = createOAuth2Client(config);
  const { tokens } = await withGoogleAuthTimeout(oauth2Client.getToken(params.code));
  const user = await createSessionUserFromIdToken(oauth2Client, tokens.id_token, config);
  const previousSession = readOAuthSession(event, config);
  const previousRefreshToken =
    previousSession?.user?.googleSubject === user.googleSubject
      ? previousSession?.tokens?.refresh_token
      : null;
  const refreshToken = tokens.refresh_token || previousRefreshToken;

  if (!refreshToken) {
    throw createHttpError(
      "Google 동의 화면을 통해 다시 로그인해 주세요.",
      401,
      "MISSING_REFRESH_TOKEN",
    );
  }

  const now = Date.now();

  return {
    createdAt: now,
    updatedAt: now,
    lastUsedAt: now,
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

export const getAuthenticatedOAuthClient = async (
  event: NetlifyEvent,
): Promise<AuthenticatedOAuthContext> => {
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

  const now = Date.now();
  validateSessionLifetime(session, now);

  const oauth2Client = createOAuth2Client(config);
  let refreshedTokens: OAuthSessionTokens | null = null;

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
    if (expiryDate <= now + TOKEN_REFRESH_SKEW_MS) {
      await withGoogleAuthTimeout(oauth2Client.getAccessToken());
    }
  } catch (error) {
    const authError = error as { code?: string };
    if (authError.code === "GOOGLE_AUTH_TIMEOUT") {
      throw error;
    }

    throw createSessionExpiredError(
      "Google 세션이 만료되었습니다. 다시 로그인해 주세요.",
      "SESSION_REFRESH_FAILED",
    );
  }

  const shouldRefreshCookie = Boolean(refreshedTokens) || shouldTouchSession(session, now);
  const nextSession: OAuthSession = {
    ...session,
    updatedAt: shouldRefreshCookie ? now : session.updatedAt,
    lastUsedAt: shouldRefreshCookie ? now : getSessionLastUsedAt(session),
    tokens: refreshedTokens || storedTokens,
  };
  const setCookie = shouldRefreshCookie ? createSessionCookie(nextSession, config) : undefined;

  return { oauth2Client, session: nextSession, setCookie };
};

export const getAuthRedirectUrl = (query = "") => {
  const appOrigin = getAppOrigin();
  return `${appOrigin}/${query ? `?${query}` : ""}`;
};

const withGoogleAuthTimeout = <T>(operation: Promise<T>) =>
  withUpstreamTimeout(operation, {
    message: "Google 인증 응답 시간이 초과되었습니다.",
    code: "GOOGLE_AUTH_TIMEOUT",
  });
