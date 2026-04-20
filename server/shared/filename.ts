import path from "path";
import { createHttpError } from "./http.ts";

const SAFE_FALLBACK = "receipt";
const ALLOWED_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"]);

export const sanitizeFilenameSegment = (value: unknown, fallback = SAFE_FALLBACK) => {
  const sanitized = String(value || "")
    .normalize("NFC")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized || fallback;
};

export const getSafeImageExtension = (filename = "") => {
  const extension = path.extname(filename).toLowerCase();

  if (!ALLOWED_IMAGE_EXTENSIONS.has(extension)) {
    throw createHttpError("지원하지 않는 이미지 확장자입니다.", 400, "UNSUPPORTED_EXTENSION");
  }

  return extension;
};

const normalizeReceiptFilenamePaymentDate = (value: unknown) => {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/);

  if (!match) return raw;

  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

export const assertPaymentDate = (paymentDate: unknown) => {
  const normalized = normalizeReceiptFilenamePaymentDate(paymentDate);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw createHttpError("결제일은 YYYY-MM-DD 형식으로 입력해 주세요.", 400, "INVALID_PAYMENT_DATE");
  }

  return normalized;
};

interface ReceiptDriveFilenameInput {
  paymentDate: unknown;
  studentName: unknown;
  originalFilename: string;
}

export const buildReceiptDriveFilename = ({
  paymentDate,
  studentName,
  originalFilename,
}: ReceiptDriveFilenameInput) => {
  const safePaymentDate = assertPaymentDate(paymentDate);
  const safeStudentName = sanitizeFilenameSegment(studentName, "");

  if (!safeStudentName) {
    throw createHttpError("학생 이름을 입력해 주세요.", 400, "MISSING_STUDENT_NAME");
  }

  return `${safePaymentDate}_${safeStudentName}${getSafeImageExtension(originalFilename)}`;
};
