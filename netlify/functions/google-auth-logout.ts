import { Post } from "../../server/netlify-runtime/api-handler.ts";
import {
  OAUTH_SESSION_COOKIE,
  clearOAuthCookie,
} from "../../server/integrations/google-oauth.ts";
import { usesSecureOrigin } from "../../server/netlify-runtime/app-origin.ts";
import { jsonResponseWithCookies } from "../../server/shared/http.ts";

const LEGACY_OAUTH_TOKEN_COOKIE = "greensum_oauth_tokens";

export default Post(
  async () => {
    const cookieOptions = { secure: usesSecureOrigin() };

    return jsonResponseWithCookies(
      200,
      {
        authenticated: false,
        message: "로그아웃되었습니다.",
      },
      [
        clearOAuthCookie(OAUTH_SESSION_COOKIE, cookieOptions),
        clearOAuthCookie(LEGACY_OAUTH_TOKEN_COOKIE, cookieOptions),
      ],
    );
  },
);
