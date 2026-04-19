import { AnimatePresence } from "motion/react";
import { FeedbackMessages } from "./ui/FeedbackMessages";
import { GoogleConnectionCard } from "./ui/GoogleConnectionCard";
import { PageFooter } from "./ui/PageFooter";
import { SaveDetailsCard } from "./ui/SaveDetailsCard";
import { UploadDropzone } from "./ui/UploadDropzone";
import { useReceiptDriveFlow } from "./model/useReceiptDriveFlow";

export const ReceiptDriveUploadPage = () => {
  const {
    branches,
    canUpload,
    file,
    handleExtractPaymentDate,
    handleLogin,
    handleLogout,
    handleReset,
    handleUploadToDrive,
    isAuthenticated,
    isAuthLoading,
    isBranchesLoading,
    isExtracting,
    isUploading,
    paymentDate,
    preview,
    rejectFile,
    selectFile,
    selectedBranch,
    setPaymentDate,
    setSelectedBranch,
    setStudentName,
    studentName,
    success,
    visibleError,
  } = useReceiptDriveFlow();

  return (
    <div className="min-h-screen bg-neutral-50 p-4 text-neutral-900 md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            영수증 이미지 저장
          </h1>
          <p className="text-neutral-500">
            영수증 이미지를 선택하고 결제일과 학생 이름으로 Google Drive에 저장하세요.
          </p>
        </header>

        <main className="grid grid-cols-1 gap-8 md:grid-cols-[1.15fr_0.85fr]">
          <UploadDropzone
            file={file}
            preview={preview}
            onFileSelect={selectFile}
            onFileReject={rejectFile}
            onReset={handleReset}
          />

          <section className="space-y-6">
            <GoogleConnectionCard
              isAuthenticated={isAuthenticated}
              isAuthLoading={isAuthLoading}
              onLogin={handleLogin}
              onLogout={handleLogout}
            />

            <AnimatePresence mode="wait">
              <SaveDetailsCard
                file={file}
                branches={branches}
                selectedBranch={selectedBranch}
                paymentDate={paymentDate}
                studentName={studentName}
                isAuthenticated={isAuthenticated}
                isBranchesLoading={isBranchesLoading}
                isExtracting={isExtracting}
                isUploading={isUploading}
                canUpload={canUpload}
                onBranchChange={setSelectedBranch}
                onPaymentDateChange={setPaymentDate}
                onStudentNameChange={setStudentName}
                onExtractPaymentDate={handleExtractPaymentDate}
                onUploadToDrive={handleUploadToDrive}
              />
            </AnimatePresence>

            <FeedbackMessages error={visibleError} success={success} />
          </section>
        </main>

        <PageFooter />
      </div>
    </div>
  );
};
