import Busboy from "busboy";
import { createHttpError, getHeader } from "./http.js";
import { sanitizeFilenameSegment } from "./filename.js";

const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"]);

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export const isSupportedImageUpload = ({ filename, mimeType }) => {
  const normalizedMimeType = (mimeType || "").toLowerCase();
  const extension = filename?.includes(".") ? `.${filename.split(".").pop().toLowerCase()}` : "";

  if (normalizedMimeType.startsWith("image/")) return true;

  return ALLOWED_IMAGE_EXTENSIONS.has(extension);
};

export const parseMultipartFormData = (event) =>
  new Promise((resolve, reject) => {
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

    const fields = {};
    let uploadedFile = null;
    let fileTooLarge = false;
    let filesLimitHit = false;
    let settled = false;

    const finish = (error, result) => {
      if (settled) return;
      settled = true;

      if (error) {
        reject(error);
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

      const chunks = [];

      fileStream.on("limit", () => {
        fileTooLarge = true;
      });

      fileStream.on("data", (chunk) => {
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
      finish(createHttpError(error.message || "업로드 요청을 읽는 중 오류가 발생했습니다.", 400, "INVALID_MULTIPART"));
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
