import { api } from "../../server/config.ts";
import { startGoogleAuth } from "../../server/service/google-auth-start.ts";
import { redirectResponse } from "../../server/shared/http.ts";

export default api.Get(
  async () => {
    const { redirectUrl, cookies } = startGoogleAuth();

    return redirectResponse(redirectUrl, cookies);
  },
);
