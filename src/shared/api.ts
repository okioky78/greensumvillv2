import axios from "axios";

export interface ApiErrorBody {
  ok?: false;
  error?: string;
  code?: string;
}

export interface AuthStatusResponse {
  ok: true;
  authenticated: boolean;
  message?: string;
}

export interface DriveBranchesResponse {
  ok: true;
  branches: Array<{ name: string }>;
}

export interface DriveUploadResponse {
  ok: true;
  message: string;
  driveFileUrl: string;
  filename: string;
}

export interface PaymentDateExtractionResponse {
  ok: true;
  paymentDate: string;
}

interface DriveUploadPayload {
  file: File;
  branch: string;
  paymentDate: string;
  studentName: string;
}

export const apiClient = axios.create({
  baseURL: "/api",
});

export const getApiErrorMessage = (error: unknown, fallbackMessage: string) => {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.error || error.message || fallbackMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
};

export const isAuthRequiredError = (error: unknown) =>
  axios.isAxiosError(error) && error.response?.status === 401;

export const logoutGoogle = async () =>
  (await apiClient.post<AuthStatusResponse>("/google-auth-logout")).data;

export const getDriveBranches = async () =>
  (await apiClient.get<DriveBranchesResponse>("/drive-branches")).data;

export const extractReceiptPaymentDate = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return (await apiClient.post<PaymentDateExtractionResponse>("/extract-payment-date", formData)).data.paymentDate;
};

export const uploadReceiptToDrive = async ({ file, branch, paymentDate, studentName }: DriveUploadPayload) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("branch", branch);
  formData.append("paymentDate", paymentDate);
  formData.append("studentName", studentName);

  return (await apiClient.post<DriveUploadResponse>("/upload-to-drive", formData)).data;
};
