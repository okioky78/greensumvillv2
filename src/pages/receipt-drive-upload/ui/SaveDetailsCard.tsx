import { motion } from "motion/react";
import { Image as ImageIcon, Loader2, Save, Sparkles } from "lucide-react";

type SaveDetailsCardProps = {
  file: File | null;
  branches: string[];
  selectedBranch: string;
  paymentDate: string;
  studentName: string;
  isAuthenticated: boolean;
  isBranchesLoading: boolean;
  isExtracting: boolean;
  isUploading: boolean;
  canUpload: boolean;
  uploadRequirementMessage: string | null;
  onBranchChange: (branch: string) => void;
  onPaymentDateChange: (paymentDate: string) => void;
  onStudentNameChange: (studentName: string) => void;
  onExtractPaymentDate: () => void;
  onUploadToDrive: () => void;
};

export const SaveDetailsCard = ({
  file,
  branches,
  selectedBranch,
  paymentDate,
  studentName,
  isAuthenticated,
  isBranchesLoading,
  isExtracting,
  isUploading,
  canUpload,
  uploadRequirementMessage,
  onBranchChange,
  onPaymentDateChange,
  onStudentNameChange,
  onExtractPaymentDate,
  onUploadToDrive,
}: SaveDetailsCardProps) => {
  if (!file) return null;

  return (
    <motion.div
      key="save-details"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="flex min-h-[300px] flex-col rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-6 flex items-center gap-2 text-lg font-semibold">
        <ImageIcon className="h-5 w-5 text-neutral-400" />
        저장 정보
      </h2>

      <div className="space-y-4">
        <div className="rounded-xl bg-neutral-50 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">선택한 파일</p>
          <p className="mt-1 break-all text-sm font-medium text-neutral-800">{file.name}</p>
          <p className="mt-1 text-xs text-neutral-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-700" htmlFor="branch">
            지점
          </label>
          <select
            id="branch"
            value={selectedBranch}
            onChange={(event) => onBranchChange(event.target.value)}
            disabled={!isAuthenticated || isBranchesLoading || branches.length === 0}
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium outline-none transition focus:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:bg-neutral-50 disabled:text-neutral-400"
          >
            {branches.length === 0 ? (
              <option value="">{isBranchesLoading ? "지점 불러오는 중..." : "로그인 후 지점이 표시됩니다"}</option>
            ) : (
              branches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-700" htmlFor="paymentDate">
            결제일
          </label>
          <div className="flex gap-2">
            <input
              id="paymentDate"
              type="date"
              value={paymentDate}
              onChange={(event) => onPaymentDateChange(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium outline-none transition focus:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            />
            <button
              type="button"
              onClick={onExtractPaymentDate}
              disabled={!isAuthenticated || isExtracting}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExtracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {paymentDate ? "다시 추출" : "추출"}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-neutral-700" htmlFor="studentName">
            학생 이름
          </label>
          <input
            id="studentName"
            value={studentName}
            onChange={(event) => onStudentNameChange(event.target.value)}
            placeholder="예: 홍길동"
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium outline-none transition focus:border-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          />
        </div>

        {uploadRequirementMessage && (
          <p className="rounded-lg bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-500" aria-live="polite">
            {uploadRequirementMessage}
          </p>
        )}

        <button
          type="button"
          onClick={onUploadToDrive}
          disabled={!canUpload || isUploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 font-semibold text-white transition-all hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Google Drive에 저장
        </button>
      </div>
    </motion.div>
  );
};
