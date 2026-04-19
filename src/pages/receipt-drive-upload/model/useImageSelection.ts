import { useEffect, useState } from "react";
import { createImagePreview, revokeImagePreview } from "../../../shared/imageUpload";

export const useImageSelection = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => () => revokeImagePreview(preview), [preview]);

  const selectImage = (selectedFile: File) => {
    setFile(selectedFile);

    const nextPreview = createImagePreview(selectedFile);
    setPreview((currentPreview) => {
      revokeImagePreview(currentPreview);
      return nextPreview;
    });
  };

  const resetImage = () => {
    revokeImagePreview(preview);
    setFile(null);
    setPreview(null);
  };

  return {
    file,
    preview,
    resetImage,
    selectImage,
  };
};
