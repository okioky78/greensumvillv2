import { apiClient } from "../../../shared/api";

export type AuthStatusResponse = {
  authenticated: boolean;
  message?: string;
};

export type DriveBranchesResponse = {
  branches: Array<{ name: string }>;
};

export type DriveUploadResponse = {
  message: string;
  driveFileUrl: string;
  filename: string;
};

export type PaymentDateExtractionResponse = {
  paymentDate: string;
};

type DriveUploadPayload = {
  file: File;
  branch: string;
  paymentDate: string;
  studentName: string;
};

export const logoutGoogle = async () =>
  (await apiClient.post<AuthStatusResponse>("/google-auth-logout")).data;

export const getDriveBranches = async () =>
  (await apiClient.get<DriveBranchesResponse>("/drive-branches")).data;

export const extractReceiptPaymentDate = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return (await apiClient.post<PaymentDateExtractionResponse>("/extract-payment-date", formData)).data
    .paymentDate;
};

export const uploadReceiptToDrive = async ({
  file,
  branch,
  paymentDate,
  studentName,
}: DriveUploadPayload) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("branch", branch);
  formData.append("paymentDate", paymentDate);
  formData.append("studentName", studentName);

  return (await apiClient.post<DriveUploadResponse>("/upload-to-drive", formData)).data;
};
