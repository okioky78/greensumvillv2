import path from "path";
import Busboy from "busboy";
import { Readable } from "stream";
import { google } from "googleapis";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const JSON_HEADERS = { "Content-Type": "application/json" };
const ALLOWED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".heif",
]);

const createError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: JSON_HEADERS,
  body: JSON.stringify(body),
});

const getHeader = (headers, headerName) => {
  const target = headerName.toLowerCase();

  for (const [key, value] of Object.entries(headers || {})) {
    if (key.toLowerCase() === target) {
      return Array.isArray(value) ? value[0] : value;
    }
  }

  return "";
};

const sanitizeFilename = (filename) =>
  (filename || "receipt")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .trim() || "receipt";

const sanitizeSegment = (value, fallback) =>
  (value || fallback)
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim() || fallback;

const isSupportedUpload = ({ filename, mimeType }) => {
  const normalizedMimeType = (mimeType || "").toLowerCase();
  const extension = path.extname(filename || "").toLowerCase();

  if (normalizedMimeType.startsWith("image/")) {
    return true;
  }

  return ALLOWED_EXTENSIONS.has(extension);
};

const buildDriveFilename = (fields, originalFilename) => {
  const uploadedAt = new Date().toISOString().replace(/[^\d]/g, "").slice(0, 14);
  const branch = sanitizeSegment(fields.branch || "", "unknown-branch");
  const filename = sanitizeFilename(originalFilename);

  return `${uploadedAt}_${branch}_${filename}`;
};

const escapeDriveQueryValue = (value) => (value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");

const parseMultipartFormData = (event) =>
  new Promise((resolve, reject) => {
    const contentType = getHeader(event.headers, "content-type");
    if (!contentType.includes("multipart/form-data")) {
      reject(createError("multipart/form-data 요청만 지원합니다.", 400));
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
          filename: sanitizeFilename(info.filename),
          mimeType: info.mimeType || "application/octet-stream",
          buffer: Buffer.concat(chunks),
        };
      });
    });

    busboy.on("filesLimit", () => {
      filesLimitHit = true;
    });

    busboy.on("error", (error) => {
      finish(createError(error.message || "업로드 요청을 읽는 중 오류가 발생했습니다.", 400));
    });

    busboy.on("finish", () => {
      if (filesLimitHit) {
        finish(createError("현재는 한 번에 하나의 파일만 업로드할 수 있습니다.", 400));
        return;
      }

      if (fileTooLarge) {
        finish(createError("10MB 이하의 파일만 업로드할 수 있습니다.", 400));
        return;
      }

      if (!uploadedFile) {
        finish(createError("업로드할 파일이 없습니다.", 400));
        return;
      }

      if (!isSupportedUpload(uploadedFile)) {
        finish(createError("이미지 파일만 업로드할 수 있습니다.", 400));
        return;
      }

      finish(null, { fields, file: uploadedFile });
    });

    const bodyBuffer = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : Buffer.from(event.body || "", "utf8");

    busboy.end(bodyBuffer);
  });

const getGoogleClients = () => {
  const driveRootFolderId = (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "").trim();
  const clientEmail = (
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_SERVICE_ACCOUNT ||
    ""
  ).trim();
  const base64Key = process.env.GOOGLE_PRIVATE_KEY || "";
  const privateKey = Buffer.from(base64Key, "base64").toString("utf8").trim();

  if (!driveRootFolderId || !clientEmail || !privateKey) {
    throw createError(
      "Google Drive 자격 정보가 설정되지 않았습니다. GOOGLE_DRIVE_ROOT_FOLDER_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY를 확인해 주세요.",
      400,
    );
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  return {
    driveRootFolderId,
    clientEmail,
    drive: google.drive({ version: "v3", auth }),
  };
};

const listDirectChildFolders = async (drive, driveRootFolderId) => {
  const response = await drive.files.list({
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    q: [
      `'${escapeDriveQueryValue(driveRootFolderId)}' in parents`,
      "mimeType = 'application/vnd.google-apps.folder'",
      "trashed = false",
    ].join(" and "),
    fields: "files(id, name)",
    pageSize: 100,
  });

  return response.data.files || [];
};

const resolveBranchFolderId = async (drive, driveRootFolderId, branch) => {
  const normalizedBranch = (branch || "").trim();

  if (!normalizedBranch) {
    throw createError("지점을 선택한 뒤 저장해 주세요.", 400);
  }

  const childFolders = await listDirectChildFolders(drive, driveRootFolderId);
  const matchedFolders = childFolders.filter((folder) => (folder.name || "").trim() === normalizedBranch);

  console.info("Drive branch folder lookup:", {
    requestedBranch: normalizedBranch,
    driveRootFolderId,
    visibleChildFolderNames: childFolders.map((folder) => folder.name),
  });

  if (matchedFolders.length === 0) {
    throw createError(`'${normalizedBranch}' 지점과 같은 이름의 Google Drive 폴더를 찾을 수 없습니다.`, 400);
  }

  if (matchedFolders.length > 1) {
    throw createError(`'${normalizedBranch}' 이름의 Google Drive 폴더가 여러 개 있습니다. 부모 폴더 아래 폴더명을 하나로 정리해 주세요.`, 400);
  }

  return matchedFolders[0].id;
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method Not Allowed" });
  }

  let uploadedDriveFileId = null;

  try {
    const { fields, file } = await parseMultipartFormData(event);
    const { branch } = fields;

    const {
      driveRootFolderId,
      clientEmail,
      drive,
    } = getGoogleClients();

    console.info("Drive upload request:", {
      branch,
      driveRootFolderId,
      serviceAccount: clientEmail,
    });

    const targetDriveFolderId = await resolveBranchFolderId(drive, driveRootFolderId, branch);

    const uploadedDriveFile = await drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: buildDriveFilename(fields, file.filename),
        parents: [targetDriveFolderId],
      },
      media: {
        mimeType: file.mimeType,
        body: Readable.from(file.buffer),
      },
      fields: "id",
    });

    uploadedDriveFileId = uploadedDriveFile.data.id;

    if (!uploadedDriveFileId) {
      throw createError("Google Drive 업로드 결과를 확인할 수 없습니다.");
    }

    const driveFileUrl = `https://drive.google.com/file/d/${uploadedDriveFileId}/view`;

    return jsonResponse(200, {
      ok: true,
      message: "구글 드라이브에 저장 완료",
      driveFileUrl,
    });
  } catch (error) {
    if (uploadedDriveFileId) {
      try {
        const { drive } = getGoogleClients();
        await drive.files.delete({
          fileId: uploadedDriveFileId,
          supportsAllDrives: true,
        });
      } catch (rollbackError) {
        console.error("Drive rollback error:", rollbackError);
      }
    }

    console.error("Drive error:", error);
    const statusCode = error.statusCode || 500;
    const errorMessage = error.response?.data?.error?.message || error.message || "저장 중 오류가 발생했습니다.";

    return jsonResponse(statusCode, {
      ok: false,
      error: statusCode >= 500 ? `구글 드라이브 저장 실패: ${errorMessage}` : errorMessage,
    });
  }
};
