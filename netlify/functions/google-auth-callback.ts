import { Get } from "../../server/netlify-runtime/api-handler.ts";
import { handleGoogleAuthCallback } from "../../server/service/google-auth-callback.ts";
import { redirectResponse } from "../../server/shared/http.ts";

export default Get(
  async ({ request }) => {
    const { redirectUrl, cookies } = await handleGoogleAuthCallback(request);

    return redirectResponse(redirectUrl, cookies);
  },
);
