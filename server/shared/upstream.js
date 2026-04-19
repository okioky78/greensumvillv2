import { createHttpError } from "./http.js";

export const DEFAULT_UPSTREAM_TIMEOUT_MS = 25_000;

export const withUpstreamTimeout = (
  operation,
  {
    timeoutMs = DEFAULT_UPSTREAM_TIMEOUT_MS,
    message = "외부 서비스 응답 시간이 초과되었습니다.",
    code = "UPSTREAM_TIMEOUT",
  } = {},
) => {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(createHttpError(message, 504, code));
    }, timeoutMs);
  });

  return Promise.race([operation, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
};
