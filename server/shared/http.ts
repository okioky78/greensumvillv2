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
): Response =>
  new Response(JSON.stringify(body), {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

export const jsonResponseWithCookies = (
  statusCode: number,
  body: unknown,
  cookies: string[] = [],
): Response => {
  const response = jsonResponse(statusCode, body);
  cookies.forEach((cookie) => response.headers.append("Set-Cookie", cookie));

  return response;
};

export const redirectResponse = (location: string, cookies: string[] = []): Response => {
  const response = new Response(null, {
    status: 302,
    headers: {
      Location: location,
    },
  });

  cookies.forEach((cookie) => response.headers.append("Set-Cookie", cookie));

  return response;
};

type HeaderSource = Headers | Record<string, string | string[] | undefined> | undefined;

export const getHeader = (headers: HeaderSource, headerName: string) => {
  if (headers instanceof Headers) {
    return headers.get(headerName) || "";
  }

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

      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        return cookies;
      }

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

export const getRequestCookies = (request: Request) =>
  parseCookies(getHeader(request.headers, "cookie"));

export const methodNotAllowed = () => jsonResponse(405, { error: "Method Not Allowed" });

interface ErrorLogContext {
  userEmail?: string;
}

const getRequestLogContext = (request?: Request) => {
  if (!request) return {};

  return {
    method: request.method,
    path: new URL(request.url).pathname,
  };
};

const PUBLIC_ERROR_MESSAGES: Record<string, string> = {
  AUTH_REQUIRED: "Google 로그인이 필요합니다. 다시 로그인해 주세요.",
  AUTH_FAILED: "Google 로그인 처리 중 문제가 발생했습니다. 다시 로그인해 주세요.",
  GOOGLE_AUTH_REQUIRED: "Google 권한이 만료되었습니다. 다시 로그인해 주세요.",
  DRIVE_ROOT_UNAVAILABLE:
    "저장 폴더를 불러오지 못했습니다. Google 계정을 확인한 뒤 다시 로그인해 주세요.",
  DRIVE_UPLOAD_UNAVAILABLE:
    "선택한 지점 폴더에 저장할 수 없습니다. 폴더 편집 권한을 확인해 주세요.",
  DRIVE_FOLDER_UNAVAILABLE:
    "저장할 지점 폴더를 확인할 수 없습니다. 관리자에게 문의해 주세요.",
  INVALID_UPLOAD: "파일을 확인해 주세요. 이미지는 4MB 이하만 업로드할 수 있습니다.",
  PAYMENT_DATE_NOT_FOUND: "결제일을 찾지 못했습니다. 직접 입력해 주세요.",
  AI_FAILED: "정보 추출 중 문제가 발생했습니다. 다시 시도하거나 직접 입력해 주세요.",
  SERVER_ERROR: "요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
};

const PUBLIC_ERROR_CODE_BY_INTERNAL_CODE: Record<string, string> = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  INVALID_SESSION_CREATED_AT: "AUTH_REQUIRED",
  MISSING_GOOGLE_IDENTITY: "AUTH_REQUIRED",
  SESSION_ABSOLUTE_EXPIRED: "AUTH_REQUIRED",
  SESSION_IDLE_EXPIRED: "AUTH_REQUIRED",
  SESSION_REFRESH_FAILED: "AUTH_REQUIRED",

  INVALID_ID_TOKEN: "AUTH_FAILED",
  INVALID_OAUTH_STATE: "AUTH_FAILED",
  MISSING_AUTH_CODE: "AUTH_FAILED",
  MISSING_ID_TOKEN: "AUTH_FAILED",
  MISSING_REFRESH_TOKEN: "AUTH_FAILED",
  OAUTH_DENIED: "AUTH_FAILED",

  DRIVE_AUTH_FAILED: "GOOGLE_AUTH_REQUIRED",

  DRIVE_ROOT_ACCESS_DENIED: "DRIVE_ROOT_UNAVAILABLE",
  DRIVE_ROOT_NOT_FOUND: "DRIVE_ROOT_UNAVAILABLE",
  DRIVE_UPLOAD_ACCESS_DENIED: "DRIVE_UPLOAD_UNAVAILABLE",
  DRIVE_UPLOAD_FOLDER_NOT_FOUND: "DRIVE_UPLOAD_UNAVAILABLE",

  BRANCH_FOLDER_NOT_FOUND: "DRIVE_FOLDER_UNAVAILABLE",
  DUPLICATED_BRANCH_FOLDER: "DRIVE_FOLDER_UNAVAILABLE",
  MISSING_BRANCH: "DRIVE_FOLDER_UNAVAILABLE",

  FILE_TOO_LARGE: "INVALID_UPLOAD",
  INVALID_CONTENT_TYPE: "INVALID_UPLOAD",
  INVALID_PAYMENT_DATE: "INVALID_UPLOAD",
  MISSING_FILE: "INVALID_UPLOAD",
  MISSING_STUDENT_NAME: "INVALID_UPLOAD",
  REQUEST_TOO_LARGE: "INVALID_UPLOAD",
  TOO_MANY_FILES: "INVALID_UPLOAD",
  UNSUPPORTED_EXTENSION: "INVALID_UPLOAD",
  UNSUPPORTED_FILE_TYPE: "INVALID_UPLOAD",

  PAYMENT_DATE_NOT_FOUND: "PAYMENT_DATE_NOT_FOUND",

  AI_TIMEOUT: "AI_FAILED",
  EMPTY_AI_RESPONSE: "AI_FAILED",
  INVALID_AI_RESPONSE: "AI_FAILED",
  INVALID_AI_RESPONSE_BODY: "AI_FAILED",
  MISSING_GEMINI_API_KEY: "AI_FAILED",
};

export const getPublicErrorCode = (error: HttpError) => {
  const publicCode = PUBLIC_ERROR_CODE_BY_INTERNAL_CODE[error.code];

  if (publicCode) return publicCode;
  if (error.statusCode === 401) return "AUTH_REQUIRED";
  if (error.statusCode === 400 || error.statusCode === 413) return "INVALID_UPLOAD";

  return "SERVER_ERROR";
};

export const getPublicErrorMessage = (publicCode: string) =>
  PUBLIC_ERROR_MESSAGES[publicCode] || PUBLIC_ERROR_MESSAGES.SERVER_ERROR;

const logHttpError = (error: HttpError, request?: Request, context: ErrorLogContext = {}) => {
  const publicCode = getPublicErrorCode(error);
  const logContext = {
    ...getRequestLogContext(request),
    ...context,
    statusCode: error.statusCode,
    publicCode,
    internalCode: error.code,
    message: error.message,
  };

  if (error.statusCode >= 500) {
    console.error("API error", logContext);
    return;
  }

  console.warn("API request rejected", logContext);
};

export const errorResponse = (error: unknown, request?: Request, context: ErrorLogContext = {}) => {
  if (error instanceof HttpError) {
    const headers: Record<string, string> | undefined = error.clearSessionCookie
      ? { "Set-Cookie": error.clearSessionCookie }
      : undefined;
    const publicCode = getPublicErrorCode(error);

    logHttpError(error, request, context);

    return jsonResponse(
      error.statusCode,
      {
        error: getPublicErrorMessage(publicCode),
        code: publicCode,
      },
      headers,
    );
  }

  console.error("Unhandled API error", {
    ...getRequestLogContext(request),
    ...context,
    error,
  });

  return jsonResponse(500, {
    error: getPublicErrorMessage("SERVER_ERROR"),
    code: "SERVER_ERROR",
  });
};
