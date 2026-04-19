import { createOAuthStart } from "../../server/google-oauth/index.ts";
import { Get } from "../../server/shared/api-handler.ts";
import { redirectResponse } from "../../server/shared/http.ts";

export const handler = Get(
  async () => {
    const { authorizationUrl, stateCookie } = createOAuthStart();

    return redirectResponse(authorizationUrl, [stateCookie]);
  },
);
