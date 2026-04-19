import { Loader2, LogIn, LogOut } from "lucide-react";

type GoogleConnectionCardProps = {
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  onLogin: () => void;
  onLogout: () => void;
};

export const GoogleConnectionCard = ({
  isAuthenticated,
  isAuthLoading,
  onLogin,
  onLogout,
}: GoogleConnectionCardProps) => (
  <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
    <div className="mb-5 flex items-center justify-between gap-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <LogIn className="h-5 w-5 text-neutral-400" />
        Google 연결
      </h2>
      {isAuthenticated ? (
        <button
          onClick={onLogout}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      ) : (
        <button
          onClick={onLogin}
          disabled={isAuthLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {isAuthLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Google 로그인
        </button>
      )}
    </div>
    <p className="text-sm text-neutral-500">
      {isAuthLoading
        ? "로그인 상태 확인 중..."
        : isAuthenticated
          ? "로그인한 Google 계정의 Drive 권한으로 저장합니다."
          : "Drive에 저장하려면 Google 로그인이 필요합니다."}
    </p>
  </div>
);
