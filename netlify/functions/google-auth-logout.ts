import {
  OAUTH_SESSION_COOKIE,
  clearOAuthCookie,
} from "../../server/google-oauth/index.ts";
import { Post } from "../../server/shared/api-handler.ts";
import { jsonResponseWithCookies } from "../../server/shared/http.ts";

const LEGACY_OAUTH_TOKEN_COOKIE = "greensum_oauth_tokens";

export const handler = Post(
  async () =>
    jsonResponseWithCookies(
      200,
      {
        authenticated: false,
        message: "로그아웃되었습니다.",
      },
      [
        clearOAuthCookie(OAUTH_SESSION_COOKIE),
        clearOAuthCookie(LEGACY_OAUTH_TOKEN_COOKIE),
      ],
    ),
);
