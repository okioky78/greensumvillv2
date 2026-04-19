import { useDropzone } from "react-dropzone";
import { FileText, RotateCcw, Upload } from "lucide-react";

import {
  DROPZONE_ACCEPT,
  HEIC_PREVIEW_VALUE,
  MAX_UPLOAD_SIZE_BYTES,
  getDropRejectionMessage,
} from "../model/imageUpload";

import type { DropzoneOptions } from "react-dropzone";

type UploadDropzoneProps = {
  file: File | null;
  preview: string | null;
  onFileSelect: (file: File) => void;
  onFileReject: (message: string) => void;
  onReset: () => void;
};

const UPLOAD_BOX_STYLES = {
  idle: {
    box: "border-neutral-200 hover:border-neutral-300 bg-white shadow-sm",
    iconContainer: "bg-neutral-100",
    icon: "text-neutral-400",
  },
  selected: {
    box: "border-emerald-200 bg-emerald-50/30",
    iconContainer: "bg-neutral-100",
    icon: "text-neutral-400",
  },
  active: {
    box: "border-emerald-400 bg-emerald-50 shadow-lg shadow-emerald-100",
    iconContainer: "bg-emerald-100",
    icon: "text-emerald-600",
  },
  reject: {
    box: "border-red-300 bg-red-50/40",
    iconContainer: "bg-red-100",
    icon: "text-red-500",
  },
} as const;

const UPLOAD_BOX_PROMPTS = {
  idle: "이미지를 선택하거나 드래그하세요",
  selected: "다른 이미지를 선택하거나 드래그하세요",
  active: "여기에 이미지를 놓으세요",
  reject: "이미지 파일 한 개만 업로드할 수 있습니다",
} as const;

export const UploadDropzone = ({ file, preview, onFileSelect, onFileReject, onReset }: UploadDropzoneProps) => {
  const handleDropAccepted: DropzoneOptions["onDropAccepted"] = (acceptedFiles) => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) onFileSelect(selectedFile);
  };

  const handleDropRejected: DropzoneOptions["onDropRejected"] = (fileRejections) => {
    onFileReject(getDropRejectionMessage(fileRejections));
  };

  const dropzoneOptions: DropzoneOptions = {
    accept: DROPZONE_ACCEPT,
    multiple: false,
    maxFiles: 1,
    maxSize: MAX_UPLOAD_SIZE_BYTES,
    onDropAccepted: handleDropAccepted,
    onDropRejected: handleDropRejected,
    onDragEnter: undefined,
    onDragLeave: undefined,
    onDragOver: undefined,
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone(dropzoneOptions);
  const uploadState = isDragReject ? "reject" : isDragActive ? "active" : file ? "selected" : "idle";
  const uploadBoxStyle = UPLOAD_BOX_STYLES[uploadState];
  const uploadPrompt = UPLOAD_BOX_PROMPTS[uploadState];

  return (
    <section className="space-y-6">
      <div
        {...getRootProps({
          className: `relative flex min-h-[420px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${uploadBoxStyle.box}`,
        })}
      >
        <input {...getInputProps()} />

        {preview === HEIC_PREVIEW_VALUE ? (
          <div className="mb-4 flex flex-col items-center rounded-xl bg-white p-12 shadow-sm">
            <FileText className="h-16 w-16 text-emerald-500" />
            <p className="mt-2 text-sm font-medium text-neutral-600">아이폰 사진(HEIC)이 선택되었습니다</p>
            <p className="mt-1 text-xs text-neutral-400">브라우저에서 미리보기가 제한될 수 있습니다.</p>
          </div>
        ) : preview ? (
          <img
            src={preview}
            alt="업로드 이미지 미리보기"
            className="mb-4 max-h-80 rounded-lg object-contain shadow-md"
            referrerPolicy="no-referrer"
          />
        ) : file ? (
          <div className="mb-4 rounded-xl bg-white p-12 shadow-sm">
            <FileText className="h-16 w-16 text-neutral-400" />
            <p className="mt-2 text-sm font-medium">{file.name}</p>
          </div>
        ) : (
          <div className="py-12">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-colors ${uploadBoxStyle.iconContainer}`}>
              <Upload className={`h-8 w-8 ${uploadBoxStyle.icon}`} />
            </div>
            <p className="text-sm font-medium">{uploadPrompt}</p>
            <p className="mt-1 text-xs text-neutral-400">PNG, JPG, WEBP, GIF, HEIC (최대 10MB, 한 번에 1개)</p>
          </div>
        )}
      </div>

      {file && (
        <button
          onClick={onReset}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 py-4 font-semibold text-neutral-500 transition-all hover:bg-neutral-50"
        >
          <RotateCcw className="h-5 w-5" />
          다시 선택하기
        </button>
      )}
    </section>
  );
};
