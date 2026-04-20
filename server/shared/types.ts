import type { Buffer } from "buffer";

export const Method = {
  Get: "GET",
  Post: "POST",
  Put: "PUT",
  Patch: "PATCH",
  Delete: "DELETE",
  Options: "OPTIONS",
} as const;

export type Method = (typeof Method)[keyof typeof Method];

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

