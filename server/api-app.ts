import { Hono } from "hono";
import type { ApiHonoEnv } from "./hono-context.ts";
import { requireDrive } from "./hono-context.ts";
import { allowedOriginMiddleware } from "./middleware/allowed-origin-middleware.ts";
import { googleDriveMembershipMiddleware } from "./middleware/google-drive-membership-middleware.ts";
import { getDriveBranches } from "./service/drive-branches.ts";
import { extractPaymentDate } from "./service/extract-payment-date.ts";
import { handleGoogleAuthCallback } from "./service/google-auth-callback.ts";
import { logoutGoogleAuth } from "./service/google-auth-logout.ts";
import { startGoogleAuth } from "./service/google-auth-start.ts";
import { uploadReceiptToDrive } from "./service/upload-to-drive.ts";
import {
  errorResponse,
  jsonResponse,
  jsonResponseWithCookies,
  redirectResponse,
} from "./shared/http.ts";

const apiApp = new Hono<ApiHonoEnv>().basePath("/api");

apiApp.onError((error) => errorResponse(error));

apiApp.notFound(() =>
  jsonResponse(404, {
    error: "Not Found",
    code: "NOT_FOUND",
  }),
);

apiApp.get("/google-auth-start", () => {
  const { redirectUrl, cookies } = startGoogleAuth();

  return redirectResponse(redirectUrl, cookies);
});

apiApp.get("/google-auth-callback", async (context) => {
  const { redirectUrl, cookies } = await handleGoogleAuthCallback(context.req.raw);

  return redirectResponse(redirectUrl, cookies);
});

apiApp.post("/google-auth-logout", allowedOriginMiddleware, () => {
  const { body, cookies } = logoutGoogleAuth();

  return jsonResponseWithCookies(200, body, cookies);
});

apiApp.get("/drive-branches", googleDriveMembershipMiddleware, async (context) => {
  const body = await getDriveBranches(requireDrive(context));

  return jsonResponse(200, body);
});

apiApp.post(
  "/extract-payment-date",
  allowedOriginMiddleware,
  googleDriveMembershipMiddleware,
  async (context) => {
    const body = await extractPaymentDate(context.req.raw);

    return jsonResponse(200, body);
  },
);

apiApp.post(
  "/upload-to-drive",
  allowedOriginMiddleware,
  googleDriveMembershipMiddleware,
  async (context) => {
    const body = await uploadReceiptToDrive({
      request: context.req.raw,
      drive: requireDrive(context),
    });

    return jsonResponse(200, body);
  },
);

export default apiApp;
