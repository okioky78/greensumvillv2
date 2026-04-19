import { createOAuthStart } from "../../server/google-oauth/index.js";
import { errorResponse, methodNotAllowed, redirectResponse } from "../../server/shared/http.js";

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed();
  }

  try {
    const { authorizationUrl, stateCookie } = createOAuthStart();

    return redirectResponse(authorizationUrl, [stateCookie]);
  } catch (error) {
    return errorResponse(error, "Google 로그인 시작 실패");
  }
};
