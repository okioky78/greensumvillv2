import { createHttpError, getHeader } from "./http.ts";

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
    throw createHttpError("APP_ORIGIN이 설정되지 않았습니다.", 500, "MISSING_APP_ORIGIN");
  }

  return origins[0];
};

export const validateAllowedOrigin = (request: Request) => {
  const allowedOrigins = getAllowedOrigins();
  const origin = getHeader(request.headers, "origin");
  const referer = getHeader(request.headers, "referer");
  let requestOrigin = origin;

  if (!requestOrigin && referer) {
    try {
      requestOrigin = new URL(referer).origin;
    } catch {
      requestOrigin = "";
    }
  }

  if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) {
    throw createHttpError("허용되지 않은 요청 출처입니다.", 403, "INVALID_ORIGIN");
  }
};
