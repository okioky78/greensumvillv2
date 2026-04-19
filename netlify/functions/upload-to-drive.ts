import {
  deleteDriveFile,
  getDriveConfig,
  resolveBranchFolderId,
  uploadDriveFile,
} from "../../server/google-drive/index.ts";
import { Post } from "../../server/shared/api-handler.ts";
import { buildReceiptDriveFilename } from "../../server/shared/filename.ts";
import { createHttpError, jsonResponse } from "../../server/shared/http.ts";
import { parseMultipartFormData } from "../../server/shared/multipart.ts";

export const handler = Post(
  async ({ event, drive }) => {
    if (!drive) {
      throw createHttpError("Google Drive 인증이 필요합니다.", 401, "DRIVE_AUTH_REQUIRED");
    }

    let uploadedDriveFileId = null;

    try {
      const { fields, file } = await parseMultipartFormData(event);
      const { driveRootFolderId } = getDriveConfig();

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

      return jsonResponse(200, {
        message: "구글 드라이브에 저장 완료",
        driveFileUrl: uploadedDriveFile.webViewLink,
        filename,
      });
    } catch (error) {
      if (uploadedDriveFileId) {
        try {
          await deleteDriveFile({ drive, fileId: uploadedDriveFileId });
        } catch (rollbackError) {
          console.error("Drive rollback error:", rollbackError);
        }
      }

      throw error;
    }
  },
);
