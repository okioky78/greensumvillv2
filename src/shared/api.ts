import axios from "axios";

export type ApiErrorBody = {
  error?: string;
  code?: string;
};

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
