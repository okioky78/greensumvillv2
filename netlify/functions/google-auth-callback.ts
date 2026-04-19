import {
  OAUTH_SESSION_COOKIE,
  OAUTH_STATE_COOKIE,
  clearOAuthCookie,
  createOAuth2Client,
  createOAuthSessionFromCallback,
  createSessionCookie,
  getAuthRedirectUrl,
} from "../../server/google-oauth/index.ts";
import {
  createDriveClient,
  getDriveConfig,
  requireDriveRootAccess,
} from "../../server/google-drive/index.ts";
import { redirectResponse } from "../../server/shared/http.ts";
import { Method, type NetlifyEvent } from "../../server/shared/types.ts";

const LEGACY_OAUTH_TOKEN_COOKIE = "greensum_oauth_tokens";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Google 로그인에 실패했습니다.";

export const handler = async (event: NetlifyEvent) => {
  if (event.httpMethod !== Method.Get) {
    return redirectResponse(getAuthRedirectUrl("authError=method-not-allowed"));
  }

  try {
    const session = await createOAuthSessionFromCallback(event);
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(session.tokens);

    await requireDriveRootAccess(
      createDriveClient(oauth2Client),
      getDriveConfig().driveRootFolderId,
    );

    return redirectResponse(getAuthRedirectUrl("auth=success"), [
      createSessionCookie(session),
      clearOAuthCookie(OAUTH_STATE_COOKIE),
      clearOAuthCookie(LEGACY_OAUTH_TOKEN_COOKIE),
    ]);
  } catch (error) {
    const message = encodeURIComponent(getErrorMessage(error));
    const cookies = [
      clearOAuthCookie(OAUTH_STATE_COOKIE),
      clearOAuthCookie(OAUTH_SESSION_COOKIE),
      clearOAuthCookie(LEGACY_OAUTH_TOKEN_COOKIE),
    ];

    return redirectResponse(getAuthRedirectUrl(`authError=${message}`), cookies);
  }
};
