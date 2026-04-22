import { createHttpError } from "./shared/http.ts";

export const getAllowedOrigins = () => {
  const configuredOrigins = (process.env.APP_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const netlifyUrl = (process.env.URL || "").trim();
  const localOrigins =
    process.env.NETLIFY_DEV === "true" || (!configuredOrigins.length && !netlifyUrl)
      ? ["http://localhost:8888"]
      : [];

  return Array.from(new Set([
    ...configuredOrigins,
    netlifyUrl,
    ...localOrigins,
  ].filter(Boolean)));
};

export const getAppOrigin = () => {
  const origins = getAllowedOrigins();
  if (!origins.length) {
    throw createHttpError("APP_ORIGIN is not configured.", 500, "MISSING_APP_ORIGIN");
  }

  return origins[0];
};

export const usesSecureOrigin = () => {
  if (process.env.NETLIFY_DEV === "true") return false;

  return getAllowedOrigins()[0]?.startsWith("https://") ?? false;
};

export const getAuthRedirectUrl = (query = "") => {
  const appOrigin = getAppOrigin();
  return `${appOrigin}/${query ? `?${query}` : ""}`;
};
