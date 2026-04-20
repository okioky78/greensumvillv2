import { Get } from "../../server/api-runtime/api-handler.ts";
import { getDriveConfig, listDirectChildFolders } from "../../server/integrations/google-drive.ts";
import { createHttpError, jsonResponse } from "../../server/shared/http.ts";

export default Get(
  async ({ drive }) => {
    if (!drive) {
      throw createHttpError("Google Drive 인증이 필요합니다.", 401, "DRIVE_AUTH_REQUIRED");
    }

    const { driveRootFolderId } = getDriveConfig();
    const folders = await listDirectChildFolders(drive, driveRootFolderId);

    return jsonResponse(200, {
      branches: folders.map((folder) => ({ name: folder.name })),
    });
  },
);
