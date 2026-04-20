import { createOAuthStart } from "../integrations/google-oauth.ts";
import { usesSecureOrigin } from "../netlify-runtime/app-origin.ts";

export const startGoogleAuth = () => {
  const { authorizationUrl, stateCookie } = createOAuthStart({
    secure: usesSecureOrigin(),
  });

  return {
    redirectUrl: authorizationUrl,
    cookies: [stateCookie],
  };
};
