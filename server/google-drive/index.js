import { Readable } from "stream";
import { google } from "googleapis";
import { createHttpError } from "../shared/http.js";
import { withUpstreamTimeout } from "../shared/upstream.js";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

export const getDriveConfig = () => {
  const driveRootFolderId = (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "").trim();

  if (!driveRootFolderId) {
    throw createHttpError("GOOGLE_DRIVE_ROOT_FOLDER_ID가 설정되지 않았습니다.", 500, "MISSING_DRIVE_ROOT_FOLDER");
  }

  return { driveRootFolderId };
};

export const createDriveClient = (auth) => google.drive({ version: "v3", auth });

export const requireDriveRootAccess = async (
  drive,
  driveRootFolderId = getDriveConfig().driveRootFolderId,
) => {
  try {
    const response = await withDriveTimeout(
      drive.files.get({
        fileId: driveRootFolderId,
        fields: "id,name,mimeType",
        supportsAllDrives: true,
      }),
    );

    if (response.data.mimeType !== FOLDER_MIME_TYPE) {
      throw createHttpError(
        "설정된 Google Drive 저장소가 폴더가 아닙니다.",
        500,
        "DRIVE_ROOT_NOT_FOLDER",
      );
    }

    return response.data;
  } catch (error) {
    const statusCode = error.statusCode || error.status || error.response?.status;
    if (statusCode === 403 || statusCode === 404) {
      throw createHttpError(
        "이 Google 계정은 영수증 저장 폴더에 접근할 수 없습니다. 관리자에게 폴더 공유 권한을 요청해 주세요.",
        403,
        "DRIVE_ROOT_ACCESS_DENIED",
      );
    }

    throw error;
  }
};

const escapeDriveQueryValue = (value) => (value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");

export const listDirectChildFolders = async (drive, driveRootFolderId = getDriveConfig().driveRootFolderId) => {
  const folders = [];
  let pageToken;

  do {
    const response = await withDriveTimeout(
      drive.files.list({
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        q: [
          `'${escapeDriveQueryValue(driveRootFolderId)}' in parents`,
          `mimeType = '${FOLDER_MIME_TYPE}'`,
          "trashed = false",
        ].join(" and "),
        fields: "nextPageToken, files(id, name)",
        pageSize: 100,
        pageToken,
      }),
    );

    folders.push(...(response.data.files || []));
    pageToken = response.data.nextPageToken;
  } while (pageToken);

  return folders;
};

export const resolveBranchFolderId = async ({ drive, driveRootFolderId = getDriveConfig().driveRootFolderId, branch }) => {
  const normalizedBranch = (branch || "").trim();

  if (!normalizedBranch) {
    throw createHttpError("지점을 선택한 뒤 저장해 주세요.", 400, "MISSING_BRANCH");
  }

  const childFolders = await listDirectChildFolders(drive, driveRootFolderId);
  const matchedFolders = childFolders.filter((folder) => (folder.name || "").trim() === normalizedBranch);

  console.info("Drive branch folder lookup:", {
    requestedBranch: normalizedBranch,
    driveRootFolderId,
    visibleChildFolderNames: childFolders.map((folder) => folder.name),
  });

  if (matchedFolders.length === 0) {
    throw createHttpError(`'${normalizedBranch}' 지점과 같은 이름의 Google Drive 폴더를 찾을 수 없습니다.`, 400, "BRANCH_FOLDER_NOT_FOUND");
  }

  if (matchedFolders.length > 1) {
    throw createHttpError(`'${normalizedBranch}' 이름의 Google Drive 폴더가 여러 개 있습니다. 부모 폴더 아래 폴더명을 하나로 정리해 주세요.`, 400, "DUPLICATED_BRANCH_FOLDER");
  }

  return matchedFolders[0].id;
};

export const uploadDriveFile = async ({ drive, folderId, filename, file }) => {
  const response = await withDriveTimeout(
    drive.files.create({
      supportsAllDrives: true,
      requestBody: {
        name: filename,
        parents: [folderId],
      },
      media: {
        mimeType: file.mimeType,
        body: Readable.from(file.buffer),
      },
      fields: "id, webViewLink",
    }),
  );

  if (!response.data.id) {
    throw createHttpError("Google Drive 업로드 결과를 확인할 수 없습니다.", 500, "DRIVE_UPLOAD_MISSING_ID");
  }

  return {
    id: response.data.id,
    webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`,
  };
};

export const deleteDriveFile = async ({ drive, fileId }) => {
  if (!fileId) return;

  await withDriveTimeout(
    drive.files.delete({
      fileId,
      supportsAllDrives: true,
    }),
  );
};

const withDriveTimeout = (operation) =>
  withUpstreamTimeout(operation, {
    message: "Google Drive 응답 시간이 초과되었습니다.",
    code: "DRIVE_TIMEOUT",
  });
