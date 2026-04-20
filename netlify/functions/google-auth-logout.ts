import { api } from "../../server/config.ts";
import { logoutGoogleAuth } from "../../server/service/google-auth-logout.ts";
import { jsonResponseWithCookies } from "../../server/shared/http.ts";

export default api.Post(
  async () => {
    const { body, cookies } = logoutGoogleAuth();

    return jsonResponseWithCookies(200, body, cookies);
  },
);
