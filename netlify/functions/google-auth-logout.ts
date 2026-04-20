import { Post } from "../../server/api-runtime/api-handler.ts";
import {
  OAUTH_SESSION_COOKIE,
  clearOAuthCookie,
} from "../../server/integrations/google-oauth.ts";
import { jsonResponseWithCookies } from "../../server/shared/http.ts";

const LEGACY_OAUTH_TOKEN_COOKIE = "greensum_oauth_tokens";

export default Post(
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
