import { createDriveClient } from "../../integrations/google-drive.ts";
import { getAuthenticatedOAuthClient } from "../../integrations/google-oauth.ts";
import type { ApiFilter } from "../types.ts";

const publicApiPaths = [
  "/api/google-auth-start",
  "/api/google-auth-callback",
  "/api/google-auth-logout",
];

export const authenticatedDriveFilter: ApiFilter = {
  name: "authenticated-drive",
  condition: (apiContext) => {
    const requestPath = new URL(apiContext.request.url).pathname;

    return !publicApiPaths.includes(requestPath);
  },
  apply: async (apiContext) => {
    const auth = await getAuthenticatedOAuthClient(apiContext.request);

    apiContext.oauth2Client = auth.oauth2Client;
    apiContext.session = auth.session;
    apiContext.setCookie = auth.setCookie;
    apiContext.drive = createDriveClient(auth.oauth2Client);
  },
};
