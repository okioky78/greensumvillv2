import { Get } from "../../server/netlify-runtime/api-handler.ts";
import {
  createDriveClient,
  getDriveConfig,
  requireDriveRootAccess,
} from "../../server/integrations/google-drive.ts";
import {
  OAUTH_SESSION_COOKIE,
  OAUTH_STATE_COOKIE,
  clearOAuthCookie,
  createOAuth2Client,
  createOAuthSessionFromCallback,
  createSessionCookie,
} from "../../server/integrations/google-oauth.ts";
import { getAuthRedirectUrl, usesSecureOrigin } from "../../server/netlify-runtime/app-origin.ts";
import { redirectResponse } from "../../server/shared/http.ts";

const LEGACY_OAUTH_TOKEN_COOKIE = "greensum_oauth_tokens";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Google 濡쒓렇?몄뿉 ?ㅽ뙣?덉뒿?덈떎.";

export default Get(
  async ({ request }) => {
    const cookieOptions = { secure: usesSecureOrigin() };

    try {
      const session = await createOAuthSessionFromCallback(request);
      const oauth2Client = createOAuth2Client();
      oauth2Client.setCredentials(session.tokens);

      await requireDriveRootAccess(
        createDriveClient(oauth2Client),
        getDriveConfig().driveRootFolderId,
      );

      return redirectResponse(getAuthRedirectUrl("auth=success"), [
        createSessionCookie(session, cookieOptions),
        clearOAuthCookie(OAUTH_STATE_COOKIE, cookieOptions),
        clearOAuthCookie(LEGACY_OAUTH_TOKEN_COOKIE, cookieOptions),
      ]);
    } catch (error) {
      const message = encodeURIComponent(getErrorMessage(error));
      const cookies = [
        clearOAuthCookie(OAUTH_STATE_COOKIE, cookieOptions),
        clearOAuthCookie(OAUTH_SESSION_COOKIE, cookieOptions),
        clearOAuthCookie(LEGACY_OAUTH_TOKEN_COOKIE, cookieOptions),
      ];

      return redirectResponse(getAuthRedirectUrl(`authError=${message}`), cookies);
    }
  },
);
