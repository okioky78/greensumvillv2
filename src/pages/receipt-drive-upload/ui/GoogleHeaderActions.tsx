import { ExternalLink, Loader2, LogOut } from "lucide-react";

type GoogleAuthButtonProps = {
  isAuthenticated: boolean;
  isLoggingOut: boolean;
  onLogin: () => void;
  onLogout: () => void;
};

export const GoogleAuthButton = ({
  isAuthenticated,
  isLoggingOut,
  onLogin,
  onLogout,
}: GoogleAuthButtonProps) => {
  if (isAuthenticated) {
    return (
      <button
        type="button"
        onClick={onLogout}
        disabled={isLoggingOut}
        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleLogo />}
        Google 로그아웃
        {!isLoggingOut && <LogOut className="h-4 w-4 text-neutral-400" />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onLogin}
      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-neutral-800 shadow-sm ring-1 ring-neutral-200 transition hover:bg-neutral-50"
    >
      <GoogleLogo />
      Google 로그인
    </button>
  );
};

type DriveLinkButtonProps = {
  url: string | null;
};

export const DriveLinkButton = ({ url }: DriveLinkButtonProps) => {
  if (!url) {
    return (
      <button
        type="button"
        disabled
        title="Google Drive 폴더 ID 설정이 필요합니다"
        className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-400 shadow-sm"
      >
        <GoogleDriveLogo />
        Drive 폴더 설정 필요
      </button>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50"
    >
      <GoogleDriveLogo />
      Drive 폴더 열기
      <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
    </a>
  );
};

export const GoogleLogo = () => (
  <svg aria-hidden="true" className="h-4 w-4" viewBox="-0.5 0 48 48">
    <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
      <g transform="translate(-401.000000, -860.000000)">
        <g transform="translate(401.000000, 860.000000)">
          <path
            d="M9.82727273,24 C9.82727273,22.4757333 10.0804318,21.0144 10.5322727,19.6437333 L2.62345455,13.6042667 C1.08206818,16.7338667 0.213636364,20.2602667 0.213636364,24 C0.213636364,27.7365333 1.081,31.2608 2.62025,34.3882667 L10.5247955,28.3370667 C10.0772273,26.9728 9.82727273,25.5168 9.82727273,24"
            fill="#FBBC05"
          />
          <path
            d="M23.7136364,10.1333333 C27.025,10.1333333 30.0159091,11.3066667 32.3659091,13.2266667 L39.2022727,6.4 C35.0363636,2.77333333 29.6954545,0.533333333 23.7136364,0.533333333 C14.4268636,0.533333333 6.44540909,5.84426667 2.62345455,13.6042667 L10.5322727,19.6437333 C12.3545909,14.112 17.5491591,10.1333333 23.7136364,10.1333333"
            fill="#EB4335"
          />
          <path
            d="M23.7136364,37.8666667 C17.5491591,37.8666667 12.3545909,33.888 10.5322727,28.3562667 L2.62345455,34.3946667 C6.44540909,42.1557333 14.4268636,47.4666667 23.7136364,47.4666667 C29.4455,47.4666667 34.9177955,45.4314667 39.0249545,41.6181333 L31.5177727,35.8144 C29.3995682,37.1488 26.7323182,37.8666667 23.7136364,37.8666667"
            fill="#34A853"
          />
          <path
            d="M46.1454545,24 C46.1454545,22.6133333 45.9318182,21.12 45.6113636,19.7333333 L23.7136364,19.7333333 L23.7136364,28.8 L36.3181818,28.8 C35.6879545,31.8912 33.9724545,34.2677333 31.5177727,35.8144 L39.0249545,41.6181333 C43.3393409,37.6138667 46.1454545,31.6490667 46.1454545,24"
            fill="#4285F4"
          />
        </g>
      </g>
    </g>
  </svg>
);

const GoogleDriveLogo = () => (
  <svg aria-hidden="true" className="h-4 w-4" viewBox="0 -13.5 256 256" preserveAspectRatio="xMidYMid">
    <g>
      <path
        d="M19.3542312,196.033928 L30.644172,215.534816 C32.9900287,219.64014 36.3622164,222.86588 40.3210929,225.211737 C51.6602421,210.818376 59.5534225,199.772864 64.000634,192.075201 C68.5137119,184.263529 74.0609657,172.045039 80.6423954,155.41973 C62.9064315,153.085282 49.4659974,151.918058 40.3210929,151.918058 C31.545465,151.918058 18.1051007,153.085282 0,155.41973 C0,159.964996 1.17298825,164.510261 3.51893479,168.615586 L19.3542312,196.033928 Z"
        fill="#0066DA"
      />
      <path
        d="M215.681443,225.211737 C219.64032,222.86588 223.012507,219.64014 225.358364,215.534816 L230.050377,207.470615 L252.483511,168.615586 C254.829368,164.510261 256.002446,159.964996 256.002446,155.41973 C237.79254,153.085282 224.376613,151.918058 215.754667,151.918058 C206.488712,151.918058 193.072785,153.085282 175.506888,155.41973 C182.010479,172.136093 187.484394,184.354584 191.928633,192.075201 C196.412073,199.863919 204.329677,210.909431 215.681443,225.211737 Z"
        fill="#EA4335"
      />
      <path
        d="M128.001268,73.3111515 C141.121182,57.4655263 150.162898,45.2470011 155.126415,36.6555757 C159.123121,29.7376196 163.521739,18.6920726 168.322271,3.51893479 C164.363395,1.1729583 159.818129,0 155.126415,0 L100.876121,0 C96.1841079,0 91.638842,1.31958557 87.6799655,3.51893479 C93.7861943,20.9210065 98.9675428,33.3058067 103.224011,40.6733354 C107.927832,48.8151881 116.186918,59.6944602 128.001268,73.3111515 Z"
        fill="#00832D"
      />
      <path
        d="M175.360141,155.41973 L80.6420959,155.41973 L40.3210929,225.211737 C44.2799694,227.557893 48.8252352,228.730672 53.5172481,228.730672 L202.485288,228.730672 C207.177301,228.730672 211.722567,227.411146 215.681443,225.211737 L175.360141,155.41973 Z"
        fill="#2684FC"
      />
      <path
        d="M128.001268,73.3111515 L87.680265,3.51893479 C83.7213885,5.86488134 80.3489013,9.09044179 78.0030446,13.1960654 L3.51893479,142.223575 C1.17298825,146.329198 0,150.874464 0,155.41973 L80.6423954,155.41973 L128.001268,73.3111515 Z"
        fill="#00AC47"
      />
      <path
        d="M215.241501,77.7099697 L177.999492,13.1960654 C175.653635,9.09044179 172.281148,5.86488134 168.322271,3.51893479 L128.001268,73.3111515 L175.360141,155.41973 L255.855999,155.41973 C255.855999,150.874464 254.682921,146.329198 252.337064,142.223575 L215.241501,77.7099697 Z"
        fill="#FFBA00"
      />
    </g>
  </svg>
);
