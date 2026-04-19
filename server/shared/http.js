export class HttpError extends Error {
  constructor(message, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const createHttpError = (message, statusCode = 500, code = "INTERNAL_ERROR") =>
  new HttpError(message, statusCode, code);

export const jsonResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    ...headers,
  },
  body: JSON.stringify(body),
});

export const getHeader = (headers, headerName) => {
  const target = headerName.toLowerCase();

  for (const [key, value] of Object.entries(headers || {})) {
    if (key.toLowerCase() === target) {
      return Array.isArray(value) ? value[0] : value || "";
    }
  }

  return "";
};

export const parseCookies = (cookieHeader = "") =>
  cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex === -1) return cookies;

      const name = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      cookies[name] = decodeURIComponent(value);
      return cookies;
    }, {});

export const serializeCookie = (name, value, options = {}) => {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);

  return parts.join("; ");
};

export const getRequestCookies = (event) => parseCookies(getHeader(event.headers, "cookie"));

export const getAllowedOrigins = () => {
  const configuredOrigins = (process.env.APP_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const netlifyUrl = (process.env.URL || "").trim();
  const localOrigins = process.env.NETLIFY_DEV === "true" || (!configuredOrigins.length && !netlifyUrl)
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

export const validateAllowedOrigin = (event) => {
  const allowedOrigins = getAllowedOrigins();
  const origin = getHeader(event.headers, "origin");
  const referer = getHeader(event.headers, "referer");
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

export const methodNotAllowed = () => jsonResponse(405, { ok: false, error: "Method Not Allowed" });

export const errorResponse = (error, fallbackMessage) => {
  const statusCode = error.statusCode || error.status || error.response?.status || 500;
  const googleMessage = error.response?.data?.error?.message;
  const message = googleMessage || error.message || fallbackMessage;
  const headers = error.clearSessionCookie
    ? { "Set-Cookie": error.clearSessionCookie }
    : {};

  if (statusCode >= 500) {
    console.error(fallbackMessage, error);
  }

  return jsonResponse(
    statusCode,
    {
      ok: false,
      error: statusCode >= 500 ? `${fallbackMessage}: ${message}` : message,
      code: error.code || "UNKNOWN_ERROR",
    },
    headers,
  );
};
