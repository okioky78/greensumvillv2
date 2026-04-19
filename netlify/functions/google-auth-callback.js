import {
  OAUTH_SESSION_COOKIE,
  OAUTH_STATE_COOKIE,
  clearOAuthCookie,
  createOAuth2Client,
  createOAuthSessionFromCallback,
  createSessionCookie,
  getAuthRedirectUrl,
} from "../../server/google-oauth/index.js";
import {
  createDriveClient,
  getDriveConfig,
  requireDriveRootAccess,
} from "../../server/google-drive/index.js";

const LEGACY_OAUTH_TOKEN_COOKIE = "greensum_oauth_tokens";

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 302,
      headers: {
        Location: getAuthRedirectUrl("authError=method-not-allowed"),
      },
    };
  }

  try {
    const session = await createOAuthSessionFromCallback(event);
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials(session.tokens);

    await requireDriveRootAccess(
      createDriveClient(oauth2Client),
      getDriveConfig().driveRootFolderId,
    );

    return {
      statusCode: 302,
      headers: {
        Location: getAuthRedirectUrl("auth=success"),
      },
      multiValueHeaders: {
        "Set-Cookie": [
          createSessionCookie(session),
          clearOAuthCookie(OAUTH_STATE_COOKIE),
          clearOAuthCookie(LEGACY_OAUTH_TOKEN_COOKIE),
        ],
      },
    };
  } catch (error) {
    const message = encodeURIComponent(
      error.message || "Google 로그인에 실패했습니다.",
    );
    const cookies = [
      clearOAuthCookie(OAUTH_STATE_COOKIE),
      clearOAuthCookie(OAUTH_SESSION_COOKIE),
      clearOAuthCookie(LEGACY_OAUTH_TOKEN_COOKIE),
    ];

    return {
      statusCode: 302,
      headers: {
        Location: getAuthRedirectUrl(`authError=${message}`),
      },
      multiValueHeaders: {
        "Set-Cookie": cookies,
      },
    };
  }
};
