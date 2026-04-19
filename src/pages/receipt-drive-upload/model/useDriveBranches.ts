import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiErrorMessage, isAuthRequiredError } from "../../../shared/api";
import { getDriveBranches } from "../api/receiptDriveApi";

type UseDriveBranchesOptions = {
  enabled: boolean;
  onAuthRequired: () => void;
};

export const useDriveBranches = ({
  enabled,
  onAuthRequired,
}: UseDriveBranchesOptions) => {
  const driveBranchesQuery = useQuery({
    queryKey: ["driveBranches"],
    queryFn: getDriveBranches,
    enabled,
    select: (response) => response.branches.map((branch) => branch.name).filter(Boolean),
  });

  useEffect(function clearSessionWhenBranchesRequireAuth() {
    if (!driveBranchesQuery.error || !isAuthRequiredError(driveBranchesQuery.error)) return;

    onAuthRequired();
  }, [driveBranchesQuery.error, onAuthRequired]);

  return {
    branches: driveBranchesQuery.data ?? [],
    errorMessage: driveBranchesQuery.error
      ? getApiErrorMessage(driveBranchesQuery.error, "지점 폴더를 불러오지 못했습니다.")
      : null,
    isLoading: driveBranchesQuery.isLoading || driveBranchesQuery.isFetching,
  };
};
