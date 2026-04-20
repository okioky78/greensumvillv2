import {
  getDriveConfig,
  listDirectChildFolders,
  type DriveClient,
} from "../integrations/google-drive.ts";

export const getDriveBranches = async (drive: DriveClient) => {
  const { driveRootFolderId } = getDriveConfig();
  const folders = await listDirectChildFolders(drive, driveRootFolderId);

  return {
    branches: folders.map((folder) => ({ name: folder.name })),
  };
};
