import type { Buffer } from "buffer";

export type HeaderValue = string | string[] | undefined;
export type Headers = Record<string, HeaderValue>;

export const Method = {
  Get: "GET",
  Post: "POST",
  Put: "PUT",
  Patch: "PATCH",
  Delete: "DELETE",
  Options: "OPTIONS",
} as const;

export type Method = (typeof Method)[keyof typeof Method];

export interface NetlifyEvent {
  httpMethod: string;
  path?: string;
  rawUrl?: string;
  headers: Headers;
  body?: string | null;
  isBase64Encoded?: boolean;
  queryStringParameters?: Record<string, string | undefined> | null;
}

export interface NetlifyContext {
  [key: string]: unknown;
}

export interface ApiResponse {
  statusCode: number;
  headers?: Record<string, string>;
  multiValueHeaders?: Record<string, string[]>;
  body?: string;
}

export interface UploadedFile {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

export type MultipartFields = Record<string, string>;

export interface MultipartFormData {
  fields: MultipartFields;
  file: UploadedFile;
}
