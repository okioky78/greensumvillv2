import axios from "axios";

export type ApiErrorBody = {
  error?: string;
  code?: string;
};

export const apiClient = axios.create({
  baseURL: "/api",
});

const RETRY_MESSAGE = "요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";

const PUBLIC_API_ERROR_MESSAGES: Record<string, string> = {
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
  SERVER_ERROR: RETRY_MESSAGE,
};

const authRecoveryErrorCodes = new Set(["AUTH_REQUIRED", "GOOGLE_AUTH_REQUIRED"]);

export const isAuthRequiredError = (error: unknown) => {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return false;

  const status = error.response?.status;
  const code = error.response?.data?.code;

  return status === 401 || Boolean(code && authRecoveryErrorCodes.has(code));
};

export const getApiErrorMessage = (
  error: unknown,
  fallbackMessage = RETRY_MESSAGE,
) => {
  if (!axios.isAxiosError<ApiErrorBody>(error)) {
    return fallbackMessage;
  }

  const status = error.response?.status;
  const code = error.response?.data?.code;
  const message = code ? PUBLIC_API_ERROR_MESSAGES[code] : null;

  if (message) return message;
  if (status === 401) return PUBLIC_API_ERROR_MESSAGES.AUTH_REQUIRED;
  if (status && status >= 500) return RETRY_MESSAGE;

  return fallbackMessage;
};
