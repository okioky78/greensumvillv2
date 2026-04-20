import { createOAuthStart } from "../integrations/google-oauth.ts";
import { usesSecureOrigin } from "../config.ts";

export const startGoogleAuth = () => {
  const { authorizationUrl, stateCookie } = createOAuthStart({
    secure: usesSecureOrigin(),
  });

  return {
    redirectUrl: authorizationUrl,
    cookies: [stateCookie],
  };
};
