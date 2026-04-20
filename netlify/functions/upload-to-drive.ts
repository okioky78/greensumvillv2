import { Post } from "../../server/api-runtime/api-handler.ts";
import {
  deleteDriveFile,
  getDriveConfig,
  resolveBranchFolderId,
  uploadDriveFile,
} from "../../server/integrations/google-drive.ts";
import { buildReceiptDriveFilename } from "../../server/shared/filename.ts";
import { createHttpError, jsonResponse } from "../../server/shared/http.ts";
import { parseMultipartFormData } from "../../server/shared/multipart.ts";

export default Post(
  async ({ request, drive }) => {
    if (!drive) {
      throw createHttpError("Google Drive 인증이 필요합니다.", 401, "DRIVE_AUTH_REQUIRED");
    }

    let uploadedDriveFileId: string | undefined;

    try {
      const { fields, file } = await parseMultipartFormData(request);
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
