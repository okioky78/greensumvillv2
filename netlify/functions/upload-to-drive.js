import {
  createDriveClient,
  deleteDriveFile,
  getDriveConfig,
  resolveBranchFolderId,
  uploadDriveFile,
} from "../../server/google-drive/index.js";
import { getAuthenticatedOAuthClient } from "../../server/google-oauth/index.js";
import { buildReceiptDriveFilename } from "../../server/shared/filename.js";
import {
  errorResponse,
  headersWithOptionalCookie,
  jsonResponse,
  methodNotAllowed,
  validateAllowedOrigin,
} from "../../server/shared/http.js";
import { parseMultipartFormData } from "../../server/shared/multipart.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return methodNotAllowed();
  }

  let uploadedDriveFileId = null;
  let rollbackDrive = null;

  try {
    validateAllowedOrigin(event);

    const { oauth2Client, setCookie } = await getAuthenticatedOAuthClient(event);
    const { fields, file } = await parseMultipartFormData(event);
    const { driveRootFolderId } = getDriveConfig();
    const drive = createDriveClient(oauth2Client);
    rollbackDrive = drive;

    const targetDriveFolderId = await resolveBranchFolderId({
      drive,
      driveRootFolderId,
      branch: fields.branch,
    });

    const filename = buildReceiptDriveFilename({
      paymentDate: fields.paymentDate,
      studentName: fields.studentName,
      originalFilename: file.filename,
    });

    const uploadedDriveFile = await uploadDriveFile({
      drive,
      folderId: targetDriveFolderId,
      filename,
      file,
    });

    uploadedDriveFileId = uploadedDriveFile.id;

    return jsonResponse(
      200,
      {
        message: "구글 드라이브에 저장 완료",
        driveFileUrl: uploadedDriveFile.webViewLink,
        filename,
      },
      headersWithOptionalCookie(setCookie),
    );
  } catch (error) {
    if (uploadedDriveFileId && rollbackDrive) {
      try {
        await deleteDriveFile({ drive: rollbackDrive, fileId: uploadedDriveFileId });
      } catch (rollbackError) {
        console.error("Drive rollback error:", rollbackError);
      }
    }

    return errorResponse(error, "구글 드라이브 저장 실패");
  }
};
