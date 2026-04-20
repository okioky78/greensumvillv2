import { Get } from "../../server/netlify-runtime/api-handler.ts";
import { createOAuthStart } from "../../server/integrations/google-oauth.ts";
import { usesSecureOrigin } from "../../server/netlify-runtime/app-origin.ts";
import { redirectResponse } from "../../server/shared/http.ts";

export default Get(
  async () => {
    const { authorizationUrl, stateCookie } = createOAuthStart({
      secure: usesSecureOrigin(),
    });

    return redirectResponse(authorizationUrl, [stateCookie]);
  },
);
