import type { FileRejection } from "react-dropzone";

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
export const HEIC_PREVIEW_VALUE = "heic";

export const DROPZONE_ACCEPT = {
  "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"],
} as const;

export function isHeicImage(file: File) {
  const filename = file.name.toLowerCase();

  return (
    filename.endsWith(".heic") ||
    filename.endsWith(".heif") ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  );
}

export function createImagePreview(file: File) {
  if (isHeicImage(file)) {
    return HEIC_PREVIEW_VALUE;
  }

  return URL.createObjectURL(file);
}

export function revokeImagePreview(preview: string | null) {
  if (preview && preview !== HEIC_PREVIEW_VALUE) {
    URL.revokeObjectURL(preview);
  }
}

export function getDropRejectionMessage(fileRejections: FileRejection[]) {
  if (fileRejections.some((rejection) => rejection.errors.some((error) => error.code === "too-many-files"))) {
    return "현재는 한 번에 하나의 이미지만 업로드할 수 있습니다.";
  }

  if (fileRejections.some((rejection) => rejection.errors.some((error) => error.code === "file-too-large"))) {
    return "10MB 이하의 이미지만 업로드할 수 있습니다.";
  }

  return "이미지 파일만 업로드할 수 있습니다.";
}

