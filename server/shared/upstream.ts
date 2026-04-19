import { createHttpError } from "./http.ts";

export const DEFAULT_UPSTREAM_TIMEOUT_MS = 25_000;

interface UpstreamTimeoutOptions {
  timeoutMs?: number;
  message?: string;
  code?: string;
}

export const withUpstreamTimeout = <T>(
  operation: Promise<T>,
  {
    timeoutMs = DEFAULT_UPSTREAM_TIMEOUT_MS,
    message = "외부 서비스 응답 시간이 초과되었습니다.",
    code = "UPSTREAM_TIMEOUT",
  }: UpstreamTimeoutOptions = {},
) => {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(createHttpError(message, 504, code));
    }, timeoutMs);
  });

  return Promise.race([operation, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
};
