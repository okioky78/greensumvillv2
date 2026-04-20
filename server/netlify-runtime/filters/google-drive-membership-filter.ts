import { createDriveClient } from "../../integrations/google-drive.ts";
import { getAuthenticatedOAuthClient } from "../../integrations/google-oauth.ts";
import { usesSecureOrigin } from "../app-origin.ts";
import type { ApiFilter } from "../types.ts";

const publicApiPaths = [
  "/api/google-auth-start",
  "/api/google-auth-callback",
  "/api/google-auth-logout",
];

export const googleDriveMembershipFilter: ApiFilter = {
  name: "google-drive-membership",
  condition: (apiContext) => {
    const requestPath = new URL(apiContext.request.url).pathname;

    return !publicApiPaths.includes(requestPath);
  },
  apply: async (apiContext) => {
    const auth = await getAuthenticatedOAuthClient(apiContext.request, {
      secure: usesSecureOrigin(),
    });

    apiContext.oauth2Client = auth.oauth2Client;
    apiContext.session = auth.session;
    apiContext.sessionRefreshCookie = auth.sessionRefreshCookie;
    apiContext.drive = createDriveClient(auth.oauth2Client);
  },
};
