import { createDriveClient, getDriveConfig, listDirectChildFolders } from "../../server/google-drive/index.js";
import { getAuthenticatedOAuthClient } from "../../server/google-oauth/index.js";
import { errorResponse, jsonResponse, methodNotAllowed } from "../../server/shared/http.js";

export const handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return methodNotAllowed();
  }

  try {
    const { oauth2Client, setCookie } = await getAuthenticatedOAuthClient(event);
    const { driveRootFolderId } = getDriveConfig();
    const drive = createDriveClient(oauth2Client);
    const folders = await listDirectChildFolders(drive, driveRootFolderId);

    return jsonResponse(200, {
      ok: true,
      branches: folders.map((folder) => ({ name: folder.name })),
    }, setCookie ? { "Set-Cookie": setCookie } : {});
  } catch (error) {
    return errorResponse(error, "Google Drive 지점 목록 조회 실패");
  }
};
