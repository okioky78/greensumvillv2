import { Get } from "../../server/api-runtime/api-handler.ts";
import { createOAuthStart } from "../../server/integrations/google-oauth.ts";
import { redirectResponse } from "../../server/shared/http.ts";

export default Get(
  async () => {
    const { authorizationUrl, stateCookie } = createOAuthStart();

    return redirectResponse(authorizationUrl, [stateCookie]);
  },
);
