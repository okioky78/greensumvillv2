import { Post } from "../../server/netlify-runtime/api-handler.ts";
import { logoutGoogleAuth } from "../../server/service/google-auth-logout.ts";
import { jsonResponseWithCookies } from "../../server/shared/http.ts";

export default Post(
  async () => {
    const { body, cookies } = logoutGoogleAuth();

    return jsonResponseWithCookies(200, body, cookies);
  },
);
