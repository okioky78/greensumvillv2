import { useQuery } from "@tanstack/react-query";
import { getApiErrorMessage, isAuthRequiredError } from "../../../shared/api";
import { getDriveBranches } from "../api/receiptDriveApi";

type UseDriveBranchesOptions = {
  enabled: boolean;
};

export const useDriveBranches = ({
  enabled,
}: UseDriveBranchesOptions) => {
  const driveBranchesQuery = useQuery({
    queryKey: ["driveBranches"],
    queryFn: getDriveBranches,
    enabled,
    select: (response) => response.branches.map((branch) => branch.name).filter(Boolean),
  });

  return {
    branches: driveBranchesQuery.data ?? [],
    errorMessage: driveBranchesQuery.error
      ? getApiErrorMessage(driveBranchesQuery.error, "지점 폴더를 불러오지 못했습니다.")
      : null,
    isAuthRequired: Boolean(driveBranchesQuery.error && isAuthRequiredError(driveBranchesQuery.error)),
    isLoading: driveBranchesQuery.isLoading || driveBranchesQuery.isFetching,
  };
};
