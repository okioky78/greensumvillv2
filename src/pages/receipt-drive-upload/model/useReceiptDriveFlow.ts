import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type DriveUploadResponse,
  extractReceiptPaymentDate,
  getApiErrorMessage,
  getDriveBranches,
  isAuthRequiredError,
  logoutGoogle,
  uploadReceiptToDrive,
} from "../../../shared/api";
import { clearLoginState, hasLoginState, setLoginState } from "../../../shared/authSession";
import { useImageSelection } from "./useImageSelection";

export const useReceiptDriveFlow = () => {
  const queryClient = useQueryClient();
  const imageSelection = useImageSelection();
  const requestEpochRef = useRef(0);
  const [paymentDate, setPaymentDate] = useState("");
  const [studentName, setStudentName] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(hasLoginState);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<DriveUploadResponse | null>(null);

  const driveBranchesQuery = useQuery({
    queryKey: ["driveBranches"],
    queryFn: getDriveBranches,
    enabled: isAuthenticated,
    select: (response) => response.branches.map((branch) => branch.name).filter(Boolean),
  });

  const branches = driveBranchesQuery.data ?? [];

  const invalidatePendingRequests = () => {
    requestEpochRef.current += 1;
  };

  const isCurrentRequest = (epoch: number) => epoch === requestEpochRef.current;

  const clearAuthenticatedState = () => {
    invalidatePendingRequests();
    clearLoginState();
    setIsAuthenticated(false);
    queryClient.removeQueries({ queryKey: ["driveBranches"] });
  };

  useEffect(() => {
    setSelectedBranch((current) => {
      if (!isAuthenticated) return "";
      if (branches.includes(current)) return current;
      return branches[0] || "";
    });
  }, [branches, isAuthenticated]);

  useEffect(() => {
    if (!driveBranchesQuery.error || !isAuthRequiredError(driveBranchesQuery.error)) return;

    clearAuthenticatedState();
  }, [driveBranchesQuery.error]);

  const { mutate: logout } = useMutation({
    mutationFn: logoutGoogle,
  });

  const { mutate: extractPaymentDate, isPending: isExtracting } = useMutation({
    mutationFn: extractReceiptPaymentDate,
  });

  const { mutate: uploadToDrive, isPending: isUploading } = useMutation({
    mutationFn: uploadReceiptToDrive,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("authError");
    const authSuccess = params.get("auth");

    if (authError) {
      setError(authError);
      clearAuthenticatedState();
    }

    if (authSuccess === "success") {
      setLoginState();
      setIsAuthenticated(true);
    }

    if (authError || authSuccess) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const selectFile = (selectedFile: File) => {
    invalidatePendingRequests();
    imageSelection.selectImage(selectedFile);
    setError(null);
    setSuccess(null);
    setPaymentDate("");
  };

  const rejectFile = (message: string) => {
    setSuccess(null);
    setError(message);
  };

  const handleLogin = () => {
    window.location.href = "/api/google-auth-start";
  };

  const handleLogout = () => {
    invalidatePendingRequests();
    setError(null);
    setSuccess(null);

    logout(undefined, {
      onSuccess: () => {
        clearAuthenticatedState();
      },
      onError: (err) => {
        setError(getApiErrorMessage(err, "로그아웃하지 못했습니다."));
      },
    });
  };

  const handleExtractPaymentDate = () => {
    if (!imageSelection.file) return;

    if (!isAuthenticated) {
      setError("Google 로그인 후 결제일을 추출할 수 있습니다.");
      return;
    }

    setError(null);
    setSuccess(null);

    const requestEpoch = requestEpochRef.current;

    extractPaymentDate(imageSelection.file, {
      onSuccess: (nextPaymentDate) => {
        if (!isCurrentRequest(requestEpoch)) return;
        setPaymentDate(nextPaymentDate);
      },
      onError: (err) => {
        if (!isCurrentRequest(requestEpoch)) return;
        if (isAuthRequiredError(err)) {
          clearAuthenticatedState();
        }
        setError(getApiErrorMessage(err, "결제일 추출 중 오류가 발생했습니다."));
      },
    });
  };

  const handleUploadToDrive = () => {
    if (!imageSelection.file) {
      setError("이미지를 먼저 선택해 주세요.");
      return;
    }

    if (!isAuthenticated) {
      setError("Google 로그인 후 저장할 수 있습니다.");
      return;
    }

    if (!selectedBranch) {
      setError("저장할 지점을 선택해 주세요.");
      return;
    }

    if (!paymentDate) {
      setError("결제일을 추출하거나 직접 입력해 주세요.");
      return;
    }

    if (!studentName.trim()) {
      setError("학생 이름을 입력해 주세요.");
      return;
    }

    setError(null);
    setSuccess(null);

    const requestEpoch = requestEpochRef.current;

    uploadToDrive(
      {
        file: imageSelection.file,
        branch: selectedBranch,
        paymentDate,
        studentName: studentName.trim(),
      },
      {
        onSuccess: (uploadResult) => {
          if (!isCurrentRequest(requestEpoch)) return;
          setSuccess(uploadResult);
        },
        onError: (err) => {
          if (!isCurrentRequest(requestEpoch)) return;
          if (isAuthRequiredError(err)) {
            clearAuthenticatedState();
          }
          setError(getApiErrorMessage(err, "구글 드라이브 저장 중 오류가 발생했습니다."));
        },
      },
    );
  };

  const handleReset = () => {
    invalidatePendingRequests();
    imageSelection.resetImage();
    setPaymentDate("");
    setStudentName("");
    setError(null);
    setSuccess(null);
  };

  const queryError =
    driveBranchesQuery.error
      ? getApiErrorMessage(driveBranchesQuery.error, "지점 폴더를 불러오지 못했습니다.")
      : null;

  return {
    file: imageSelection.file,
    preview: imageSelection.preview,
    paymentDate,
    studentName,
    selectedBranch,
    branches,
    success,
    visibleError: error || queryError,
    isAuthenticated,
    isAuthLoading: false,
    isBranchesLoading: driveBranchesQuery.isLoading || driveBranchesQuery.isFetching,
    isExtracting,
    isUploading,
    canUpload: Boolean(imageSelection.file && paymentDate && studentName.trim() && selectedBranch && isAuthenticated),
    handleLogin,
    handleLogout,
    handleExtractPaymentDate,
    handleUploadToDrive,
    handleReset,
    selectFile,
    rejectFile,
    setPaymentDate,
    setSelectedBranch,
    setStudentName,
  };
};
