import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, FileText, Image as ImageIcon, RotateCcw, Upload } from "lucide-react";
import { useDropzone, type DropzoneOptions, type FileRejection } from "react-dropzone";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const DROPZONE_ACCEPT = {
  "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif"],
} as const;

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

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processSelectedFile = (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);

    const isHEIC =
      selectedFile.name.toLowerCase().endsWith(".heic") ||
      selectedFile.name.toLowerCase().endsWith(".heif") ||
      selectedFile.type === "image/heic" ||
      selectedFile.type === "image/heif";

    if (isHEIC) {
      setPreview("heic");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const handleDropAccepted = (acceptedFiles: File[]) => {
    const selectedFile = acceptedFiles[0];
    if (!selectedFile) return;
    processSelectedFile(selectedFile);
  };

  const handleDropRejected = (fileRejections: FileRejection[]) => {
    if (fileRejections.some((rejection) => rejection.errors.some((error) => error.code === "too-many-files"))) {
      setError("현재는 한 번에 하나의 이미지만 업로드할 수 있습니다.");
      return;
    }

    if (fileRejections.some((rejection) => rejection.errors.some((error) => error.code === "file-too-large"))) {
      setError("10MB 이하의 이미지만 업로드할 수 있습니다.");
      return;
    }

    setError("이미지 파일만 업로드할 수 있습니다.");
  };

  const dropzoneOptions: DropzoneOptions = {
    accept: DROPZONE_ACCEPT,
    multiple: false,
    maxFiles: 1,
    maxSize: MAX_UPLOAD_SIZE_BYTES,
    onDropAccepted: handleDropAccepted,
    onDropRejected: handleDropRejected,
    onDragEnter: undefined,
    onDragOver: undefined,
    onDragLeave: undefined,
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone(dropzoneOptions);
  const uploadState = isDragReject ? "reject" : isDragActive ? "active" : file ? "selected" : "idle";
  const uploadBoxStyle = UPLOAD_BOX_STYLES[uploadState];
  const uploadPrompt = UPLOAD_BOX_PROMPTS[uploadState];

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-neutral-50 p-4 text-neutral-900 md:p-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-12 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-4xl font-bold tracking-tight"
          >
            영수증 이미지 업로드
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-neutral-500"
          >
            영수증 이미지를 선택하거나 드래그해 미리 확인하세요.
          </motion.p>
        </header>

        <main className="grid grid-cols-1 gap-8 md:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div
              {...getRootProps({
                className: `relative flex min-h-[420px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all ${uploadBoxStyle.box}`,
              })}
            >
              <input {...getInputProps()} />

              {preview === "heic" ? (
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
                onClick={handleReset}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 py-4 font-semibold text-neutral-500 transition-all hover:bg-neutral-50"
              >
                <RotateCcw className="h-5 w-5" />
                다시 선택하기
              </button>
            )}
          </section>

          <section className="space-y-6">
            <div className="flex min-h-[300px] flex-col rounded-2xl border border-neutral-100 bg-white p-8 shadow-sm">
              <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
                <ImageIcon className="h-5 w-5 text-neutral-400" />
                선택한 이미지
              </h2>

              <AnimatePresence mode="wait">
                {file ? (
                  <motion.div
                    key="file"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <div className="rounded-xl bg-neutral-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">파일명</p>
                      <p className="mt-1 break-all text-sm font-medium text-neutral-800">{file.name}</p>
                    </div>
                    <div className="rounded-xl bg-neutral-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">파일 크기</p>
                      <p className="mt-1 text-sm font-medium text-neutral-800">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-grow flex-col items-center justify-center text-center text-neutral-400"
                  >
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-50">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                    <p className="text-sm">
                      이미지를 업로드하면
                      <br />
                      파일 정보가 표시됩니다.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-red-600"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </main>

        <footer className="mt-16 border-t border-neutral-100 pt-8 text-center text-xs text-neutral-400">
          <p>© 2024 영수증 이미지 업로드</p>
        </footer>
      </div>
    </div>
  );
}
