import { Get } from "../../server/netlify-runtime/api-handler.ts";
import { startGoogleAuth } from "../../server/service/google-auth-start.ts";
import { redirectResponse } from "../../server/shared/http.ts";

export default Get(
  async () => {
    const { redirectUrl, cookies } = startGoogleAuth();

    return redirectResponse(redirectUrl, cookies);
  },
);
