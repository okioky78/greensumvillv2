import Busboy from "busboy";
import { createHttpError, getHeader } from "./http.ts";
import { sanitizeFilenameSegment } from "./filename.ts";
import type { MultipartFormData, NetlifyEvent, UploadedFile } from "./types.ts";

const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"]);

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "";

export const isSupportedImageUpload = ({ filename, mimeType }: UploadedFile) => {
  const normalizedMimeType = (mimeType || "").toLowerCase();
  const extensionStart = filename.lastIndexOf(".");
  const extension = extensionStart >= 0 ? filename.slice(extensionStart).toLowerCase() : "";

  if (normalizedMimeType.startsWith("image/")) return true;

  return ALLOWED_IMAGE_EXTENSIONS.has(extension);
};

export const parseMultipartFormData = (event: NetlifyEvent) =>
  new Promise<MultipartFormData>((resolve, reject) => {
    const contentType = getHeader(event.headers, "content-type");
    if (!contentType.includes("multipart/form-data")) {
      reject(createHttpError("multipart/form-data 요청만 지원합니다.", 400, "INVALID_CONTENT_TYPE"));
      return;
    }

    const busboy = Busboy({
      headers: { "content-type": contentType },
      limits: {
        files: 1,
        fileSize: MAX_UPLOAD_SIZE_BYTES,
      },
    });

    const fields: Record<string, string> = {};
    let uploadedFile: UploadedFile | null = null;
    let fileTooLarge = false;
    let filesLimitHit = false;
    let settled = false;

    const finish = (error: unknown, result?: MultipartFormData) => {
      if (settled) return;
      settled = true;

      if (error) {
        reject(error);
        return;
      }

      if (!result) {
        reject(createHttpError("업로드 요청을 처리하지 못했습니다.", 400, "INVALID_MULTIPART"));
        return;
      }

      resolve(result);
    };

    busboy.on("field", (fieldName, value) => {
      fields[fieldName] = value;
    });

    busboy.on("file", (fieldName, fileStream, info) => {
      if (fieldName !== "file") {
        fileStream.resume();
        return;
      }

      const chunks: Buffer[] = [];

      fileStream.on("limit", () => {
        fileTooLarge = true;
      });

      fileStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      fileStream.on("end", () => {
        if (fileTooLarge) return;

        uploadedFile = {
          filename: sanitizeFilenameSegment(info.filename, "receipt"),
          mimeType: info.mimeType || "application/octet-stream",
          buffer: Buffer.concat(chunks),
        };
      });
    });

    busboy.on("filesLimit", () => {
      filesLimitHit = true;
    });

    busboy.on("error", (error) => {
      finish(createHttpError(getErrorMessage(error) || "업로드 요청을 읽는 중 오류가 발생했습니다.", 400, "INVALID_MULTIPART"));
    });

    busboy.on("finish", () => {
      if (filesLimitHit) {
        finish(createHttpError("현재는 한 번에 하나의 파일만 업로드할 수 있습니다.", 400, "TOO_MANY_FILES"));
        return;
      }

      if (fileTooLarge) {
        finish(createHttpError("10MB 이하의 이미지만 업로드할 수 있습니다.", 400, "FILE_TOO_LARGE"));
        return;
      }

      if (!uploadedFile) {
        finish(createHttpError("업로드할 파일이 없습니다.", 400, "MISSING_FILE"));
        return;
      }

      if (!isSupportedImageUpload(uploadedFile)) {
        finish(createHttpError("이미지 파일만 업로드할 수 있습니다.", 400, "UNSUPPORTED_FILE_TYPE"));
        return;
      }

      finish(null, { fields, file: uploadedFile });
    });

    const bodyBuffer = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : Buffer.from(event.body || "", "utf8");

    busboy.end(bodyBuffer);
  });
