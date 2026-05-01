import { useCallback, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "../../../shared/api";
import { logoutGoogle } from "../api/receiptDriveApi";
import { clearLoginState, hasLoginState, setLoginState } from "../lib/googleLoginState";

type UseGoogleConnectionOptions = {
  onError: (message: string) => void;
  onInvalidate: () => void;
};

export const useGoogleConnection = ({
  onError,
  onInvalidate,
}: UseGoogleConnectionOptions) => {
  const queryClient = useQueryClient();
  const [isAuthenticated, setIsAuthenticated] = useState(hasLoginState);

  const { mutate: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: logoutGoogle,
  });

  const clearAuthenticatedState = useCallback(() => {
    onInvalidate();
    clearLoginState();
    setIsAuthenticated(false);
    queryClient.removeQueries({ queryKey: ["driveBranches"] });
  }, [onInvalidate, queryClient]);

  const handleLogin = () => {
    window.location.href = "/api/google-auth-start";
  };

  const handleLogout = () => {
    onInvalidate();

    logout(undefined, {
      onSuccess: () => {
        clearAuthenticatedState();
      },
      onError: (err) => {
        onError(getApiErrorMessage(err, "로그아웃하지 못했습니다."));
      },
    });
  };

  useEffect(function applyGoogleAuthRedirectResult() {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("authError");
    const authSuccess = params.get("auth");

    if (authError) {
      onError(authError);
      clearAuthenticatedState();
    }

    if (authSuccess === "success") {
      setLoginState();
      setIsAuthenticated(true);
    }

    if (authError || authSuccess) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [clearAuthenticatedState, onError]);

  return {
    clearAuthenticatedState,
    handleLogin,
    handleLogout,
    isAuthenticated,
    isLoggingOut,
  };
};
