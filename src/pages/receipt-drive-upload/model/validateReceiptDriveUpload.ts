type ReceiptDriveUploadValidationInput = {
  file: File | null;
  isAuthenticated: boolean;
  paymentDate: string;
  selectedBranch: string;
  studentName: string;
};

export const validateReceiptDriveUpload = ({
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
