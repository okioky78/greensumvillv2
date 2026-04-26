import { createHttpError, getHeader } from "./http.ts";
import { sanitizeFilenameSegment } from "./filename.ts";
import type { MultipartFormData, UploadedFile } from "./types.ts";

const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"]);
const HEIC_IMAGE_EXTENSIONS = new Set([".heic", ".heif"]);
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const MAX_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_SIZE_LABEL = "4MB";

const isFormDataFile = (value: FormDataEntryValue | null): value is File => {
  if (typeof value !== "object" || value === null) return false;

  const maybeFile = value as Partial<File>;

  return (
    typeof maybeFile.name === "string" &&
    typeof maybeFile.type === "string" &&
    typeof maybeFile.size === "number" &&
    typeof maybeFile.arrayBuffer === "function"
  );
};

export const isSupportedImageUpload = ({ filename, mimeType }: UploadedFile) => {
  const normalizedMimeType = (mimeType || "").toLowerCase();
  const extensionStart = filename.lastIndexOf(".");
  const extension = extensionStart >= 0 ? filename.slice(extensionStart).toLowerCase() : "";

  if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) return false;
  if (ALLOWED_IMAGE_MIME_TYPES.has(normalizedMimeType)) return true;

  return HEIC_IMAGE_EXTENSIONS.has(extension) && normalizedMimeType === "application/octet-stream";
};

export const parseMultipartFormData = async (request: Request): Promise<MultipartFormData> => {
  const contentType = getHeader(request.headers, "content-type");
  if (!contentType.includes("multipart/form-data")) {
    throw createHttpError("multipart/form-data 요청만 지원합니다.", 400, "INVALID_CONTENT_TYPE");
  }

  const formData = await request.formData();
  const fileValues = formData.getAll("file").filter(isFormDataFile);

  if (fileValues.length > 1) {
    throw createHttpError("현재는 한 번에 하나의 파일만 업로드할 수 있습니다.", 400, "TOO_MANY_FILES");
  }

  const fileValue = fileValues[0];
  if (!fileValue) {
    throw createHttpError("업로드할 파일이 없습니다.", 400, "MISSING_FILE");
  }

  if (fileValue.size > MAX_UPLOAD_SIZE_BYTES) {
    throw createHttpError(`${MAX_UPLOAD_SIZE_LABEL} 이하의 이미지만 업로드할 수 있습니다.`, 400, "FILE_TOO_LARGE");
  }

  const fields: Record<string, string> = {};
  formData.forEach((value, fieldName) => {
    if (fieldName !== "file" && typeof value === "string") {
      fields[fieldName] = value;
    }
  });

  const uploadedFile: UploadedFile = {
    filename: sanitizeFilenameSegment(fileValue.name, "receipt"),
    mimeType: fileValue.type || "application/octet-stream",
    buffer: Buffer.from(await fileValue.arrayBuffer()),
  };

  if (!isSupportedImageUpload(uploadedFile)) {
    throw createHttpError("이미지 파일만 업로드할 수 있습니다.", 400, "UNSUPPORTED_FILE_TYPE");
  }

  return { fields, file: uploadedFile };
};
