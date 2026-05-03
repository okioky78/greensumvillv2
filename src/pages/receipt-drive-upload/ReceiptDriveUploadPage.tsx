import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { useMutation } from "@tanstack/react-query";
import { FeedbackMessages } from "./ui/FeedbackMessages";
import { LoginRequiredUploadGate } from "./ui/LoginRequiredUploadGate";
import { ReceiptDriveLayout } from "./ui/ReceiptDriveLayout";
import { SaveDetailsCard } from "./ui/SaveDetailsCard";
import { UploadDropzone } from "./ui/UploadDropzone";
import {
  type DriveUploadResponse,
  extractReceiptPaymentDate,
  uploadReceiptToDrive,
} from "./api/receiptDriveApi";
import { getApiErrorMessage, isAuthRequiredError } from "../../shared/api";
import { useDriveBranches } from "./hooks/useDriveBranches";
import { useGoogleConnection } from "./hooks/useGoogleConnection";
import { useImageSelection } from "./hooks/useImageSelection";

export const ReceiptDriveUploadPage = () => {
  const imageSelection = useImageSelection();
  const flowVersionRef = useRef(0);
  const [paymentDate, setPaymentDate] = useState("");
  const [studentName, setStudentName] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<DriveUploadResponse | null>(null);

  const advanceFlowVersion = useCallback(() => {
    flowVersionRef.current += 1;
  }, []);

  const isCurrentFlow = useCallback((version: number) => version === flowVersionRef.current, []);

  const clearFeedback = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const googleConnection = useGoogleConnection({
    onError: setError,
    onInvalidate: advanceFlowVersion,
  });

  const driveBranches = useDriveBranches({
    enabled: googleConnection.isAuthenticated,
  });

  const { mutate: extractPaymentDate, isPending: isExtracting } = useMutation({
    mutationFn: extractReceiptPaymentDate,
  });

  const { mutate: uploadToDrive, isPending: isUploading } = useMutation({
    mutationFn: uploadReceiptToDrive,
  });

  const selectFile = (selectedFile: File) => {
    advanceFlowVersion();
    imageSelection.selectImage(selectedFile);
    clearFeedback();
    setPaymentDate("");
    setStudentName("");
  };

  const rejectFile = (message: string) => {
    setSuccess(null);
    setError(message);
  };

  const handleLogout = () => {
    clearFeedback();
    googleConnection.handleLogout();
  };

  const handleExtractPaymentDate = () => {
    if (!imageSelection.file) return;

    if (!googleConnection.isAuthenticated) {
      setError("Google 로그인 후 결제일을 추출할 수 있습니다.");
      return;
    }

    clearFeedback();

    const flowVersion = flowVersionRef.current;

    extractPaymentDate(imageSelection.file, {
      onSuccess: (nextPaymentDate) => {
        if (!isCurrentFlow(flowVersion)) return;
        setPaymentDate(nextPaymentDate);
      },
      onError: (err) => {
        if (!isCurrentFlow(flowVersion)) return;
        if (isAuthRequiredError(err)) {
          googleConnection.clearAuthenticatedState();
        }
        setError(getApiErrorMessage(err, "결제일 추출 중 오류가 발생했습니다."));
      },
    });
  };

  const handleUploadToDrive = () => {
    const validationError = validateReceiptDriveUpload({
      file: imageSelection.file,
      isAuthenticated: googleConnection.isAuthenticated,
      paymentDate,
      selectedBranch,
      studentName,
    });

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!imageSelection.file) return;

    clearFeedback();

    const flowVersion = flowVersionRef.current;

    uploadToDrive(
      {
        file: imageSelection.file,
        branch: selectedBranch,
        paymentDate,
        studentName: studentName.trim(),
      },
      {
        onSuccess: (uploadResult) => {
          if (!isCurrentFlow(flowVersion)) return;
          setSuccess(uploadResult);
        },
        onError: (err) => {
          if (!isCurrentFlow(flowVersion)) return;
          if (isAuthRequiredError(err)) {
            googleConnection.clearAuthenticatedState();
          }
          setError(getApiErrorMessage(err, "구글 드라이브 저장 중 오류가 발생했습니다."));
        },
      },
    );
  };

  const handleReset = () => {
    advanceFlowVersion();
    imageSelection.resetImage();
    setPaymentDate("");
    setStudentName("");
    clearFeedback();
  };

  const visibleError = error || driveBranches.errorMessage;
  const uploadRequirementMessage = getUploadRequirementMessage({
    isAuthenticated: googleConnection.isAuthenticated,
    paymentDate,
    selectedBranch,
    studentName,
  });
  const canUpload = Boolean(
    imageSelection.file &&
      paymentDate &&
      studentName.trim() &&
      selectedBranch &&
      googleConnection.isAuthenticated,
  );
  const driveRootFolderUrl = getDriveRootFolderUrl(
    import.meta.env.VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID,
  );
  const hasSelectedFile = Boolean(imageSelection.file);

  useEffect(function clearSessionWhenBranchesRequireAuth() {
    if (!driveBranches.isAuthRequired) return;

    googleConnection.clearAuthenticatedState();
  }, [driveBranches.isAuthRequired, googleConnection.clearAuthenticatedState]);

  useEffect(function syncSelectedBranchWithConnection() {
    setSelectedBranch((current) => {
      if (!googleConnection.isAuthenticated) return "";
      if (driveBranches.branches.includes(current)) return current;
      return driveBranches.branches[0] || "";
    });
  }, [driveBranches.branches, googleConnection.isAuthenticated]);

  useEffect(function resetSelectionWhenLoggedOut() {
    if (googleConnection.isAuthenticated || !imageSelection.file) return;

    handleReset();
  }, [googleConnection.isAuthenticated, imageSelection.file]);

  return (
    <ReceiptDriveLayout
      driveUrl={driveRootFolderUrl}
      isAuthenticated={googleConnection.isAuthenticated}
      isLoggingOut={googleConnection.isLoggingOut}
      onLogin={googleConnection.handleLogin}
      onLogout={handleLogout}
    >
      <main
        className={
          googleConnection.isAuthenticated && hasSelectedFile
            ? "grid grid-cols-1 gap-8 md:grid-cols-[1.15fr_0.85fr]"
            : "mx-auto flex min-h-[420px] max-w-lg flex-col justify-center sm:min-h-[500px] md:min-h-[520px]"
        }
      >
        {!googleConnection.isAuthenticated ? (
          <LoginRequiredUploadGate onLogin={googleConnection.handleLogin} />
        ) : (
          <>
            <UploadDropzone
              file={imageSelection.file}
              preview={imageSelection.preview}
              onFileSelect={selectFile}
              onFileReject={rejectFile}
              onReset={handleReset}
            />

            {!hasSelectedFile && <FeedbackMessages error={visibleError} success={success} />}

            {hasSelectedFile && (
              <section className="space-y-6">
                <AnimatePresence mode="wait">
                  <SaveDetailsCard
                    file={imageSelection.file}
                    branches={driveBranches.branches}
                    selectedBranch={selectedBranch}
                    paymentDate={paymentDate}
                    studentName={studentName}
                    isAuthenticated={googleConnection.isAuthenticated}
                    isBranchesLoading={driveBranches.isLoading}
                    isExtracting={isExtracting}
                    isUploading={isUploading}
                    canUpload={canUpload}
                    uploadRequirementMessage={uploadRequirementMessage}
                    onBranchChange={setSelectedBranch}
                    onPaymentDateChange={setPaymentDate}
                    onStudentNameChange={setStudentName}
                    onExtractPaymentDate={handleExtractPaymentDate}
                    onUploadToDrive={handleUploadToDrive}
                  />
                </AnimatePresence>

                <FeedbackMessages error={visibleError} success={success} />
              </section>
            )}
          </>
        )}
      </main>
    </ReceiptDriveLayout>
  );
};

const getDriveRootFolderUrl = (folderId?: string) => {
  const normalizedFolderId = folderId?.trim();
  if (!normalizedFolderId || normalizedFolderId.includes("your-google-drive-root-folder-id")) {
    return null;
  }

  return `https://drive.google.com/drive/folders/${encodeURIComponent(normalizedFolderId)}`;
};

type UploadRequirementInput = {
  isAuthenticated: boolean;
  paymentDate: string;
  selectedBranch: string;
  studentName: string;
};

type ReceiptDriveUploadValidationInput = UploadRequirementInput & {
  file: File | null;
};

const validateReceiptDriveUpload = ({
  file,
  isAuthenticated,
  paymentDate,
  selectedBranch,
  studentName,
}: ReceiptDriveUploadValidationInput) => {
  if (!file) return "이미지를 먼저 선택해 주세요.";
  if (!isAuthenticated) return "Google 로그인 후 저장할 수 있습니다.";
  if (!selectedBranch) return "저장할 지점을 선택해 주세요.";
  if (!paymentDate) return "결제일을 추출하거나 직접 입력해 주세요.";
  if (!studentName.trim()) return "학생 이름을 입력해 주세요.";

  return null;
};

const getUploadRequirementMessage = ({
  isAuthenticated,
  paymentDate,
  selectedBranch,
  studentName,
}: UploadRequirementInput) => {
  if (!isAuthenticated) return "Google 로그인 후 저장할 수 있습니다.";
  if (!selectedBranch) return "저장할 지점을 선택해 주세요.";
  if (!paymentDate) return "결제일을 추출하거나 직접 입력해 주세요.";
  if (!studentName.trim()) return "학생 이름을 입력해 주세요.";

  return null;
};
