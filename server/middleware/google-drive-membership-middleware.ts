import { createMiddleware } from "hono/factory";
import type { ApiHonoEnv } from "../hono-context.ts";
import { createDriveClient } from "../integrations/google-drive.ts";
import { getAuthenticatedOAuthClient } from "../integrations/google-oauth.ts";
import { usesSecureOrigin } from "../config.ts";

export const googleDriveMembershipMiddleware = createMiddleware<ApiHonoEnv>(
  async (context, next) => {
    const auth = await getAuthenticatedOAuthClient(context.req.raw, {
      secure: usesSecureOrigin(),
    });

    context.set("oauth2Client", auth.oauth2Client);
    context.set("session", auth.session);
    context.set("drive", createDriveClient(auth.oauth2Client));

    await next();

    if (auth.sessionRefreshCookie) {
      context.res.headers.append("Set-Cookie", auth.sessionRefreshCookie);
    }
  },
);
