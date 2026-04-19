import {
  OAUTH_SESSION_COOKIE,
  clearOAuthCookie,
} from "../../server/google-oauth/index.js";
import { errorResponse, methodNotAllowed, validateAllowedOrigin } from "../../server/shared/http.js";

const LEGACY_OAUTH_TOKEN_COOKIE = "greensum_oauth_tokens";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed();
  }

  try {
    validateAllowedOrigin(event);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
      },
      multiValueHeaders: {
        "Set-Cookie": [
          clearOAuthCookie(OAUTH_SESSION_COOKIE),
          clearOAuthCookie(LEGACY_OAUTH_TOKEN_COOKIE),
        ],
      },
      body: JSON.stringify({
        ok: true,
        authenticated: false,
        message: "로그아웃되었습니다.",
      }),
    };
  } catch (error) {
    return errorResponse(error, "Google 로그아웃 실패");
  }
};
