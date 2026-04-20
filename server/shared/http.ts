import type { ApiResponse, Headers, NetlifyEvent } from "./types.ts";

export class HttpError extends Error {
  statusCode: number;
  code: string;
  clearSessionCookie?: string;

  constructor(message: string, statusCode = 500, code = "INTERNAL_ERROR") {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const createHttpError = (message: string, statusCode = 500, code = "INTERNAL_ERROR") =>
  new HttpError(message, statusCode, code);

export const jsonResponse = (
  statusCode: number,
  body: unknown,
  headers: Record<string, string> = {},
): ApiResponse => ({
  statusCode,
  headers: {
    "Content-Type": "application/json",
    ...headers,
  },
  body: JSON.stringify(body),
});

export const jsonResponseWithCookies = (
  statusCode: number,
  body: unknown,
  cookies: string[] = [],
): ApiResponse => ({
  ...jsonResponse(statusCode, body),
  ...(cookies.length
    ? {
        multiValueHeaders: {
          "Set-Cookie": cookies,
        },
      }
    : {}),
});

export const redirectResponse = (location: string, cookies: string[] = []): ApiResponse => ({
  statusCode: 302,
  headers: {
    Location: location,
  },
  ...(cookies.length
    ? {
        multiValueHeaders: {
          "Set-Cookie": cookies,
        },
      }
    : {}),
});

export const getHeader = (headers: Headers | undefined, headerName: string) => {
  const target = headerName.toLowerCase();

  for (const [key, value] of Object.entries(headers || {})) {
    if (key.toLowerCase() === target) {
      return Array.isArray(value) ? value[0] : value || "";
    }
  }

  return "";
};

export const parseCookies = (cookieHeader = ""): Record<string, string> =>
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
    }, {} as Record<string, string>);

interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "Lax" | "Strict" | "None";
  path?: string;
  maxAge?: number;
}

export const serializeCookie = (name: string, value: string, options: CookieOptions = {}) => {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);

  return parts.join("; ");
};

export const getRequestCookies = (event: NetlifyEvent) =>
  parseCookies(getHeader(event.headers, "cookie"));

export const getAllowedOrigins = () => {
  const configuredOrigins = (process.env.APP_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const netlifyUrl = (process.env.URL || "").trim();
  const localOrigins = process.env.APP_ORIGIN

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

export const validateAllowedOrigin = (event: NetlifyEvent) => {
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

export const methodNotAllowed = () => jsonResponse(405, { error: "Method Not Allowed" });

export const errorResponse = (error: unknown) => {
  if (error instanceof HttpError) {
    const headers: Record<string, string> | undefined = error.clearSessionCookie
      ? { "Set-Cookie": error.clearSessionCookie }
      : undefined;

    return jsonResponse(
      error.statusCode,
      {
        error: error.message,
        code: error.code,
      },
      headers,
    );
  }

  console.error("Unhandled API error", error);

  return jsonResponse(500, {
    error: "요청 처리 중 오류가 발생했습니다.",
    code: "INTERNAL_ERROR",
  });
};
