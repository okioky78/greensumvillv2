import {
  OAUTH_SESSION_COOKIE,
  clearOAuthCookie,
} from "../integrations/google-oauth.ts";
import { usesSecureOrigin } from "../netlify-runtime/app-origin.ts";

const LEGACY_OAUTH_TOKEN_COOKIE = "greensum_oauth_tokens";

export const logoutGoogleAuth = () => {
  const cookieOptions = { secure: usesSecureOrigin() };

  return {
    body: {
      authenticated: false,
      message: "로그아웃되었습니다.",
    },
    cookies: [
      clearOAuthCookie(OAUTH_SESSION_COOKIE, cookieOptions),
      clearOAuthCookie(LEGACY_OAUTH_TOKEN_COOKIE, cookieOptions),
    ],
  };
};
