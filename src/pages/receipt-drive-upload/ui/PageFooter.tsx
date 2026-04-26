const driveRootFolderId = import.meta.env.VITE_GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();

export const PageFooter = () => (
  <footer className="mt-16 border-t border-neutral-100 pt-8 text-center text-xs text-neutral-400">
    <p>© 2024 영수증 이미지 저장</p>
    <p className="mt-2">결제일 추출: Google Gemini</p>
    {driveRootFolderId ? (
      <a
        href={`https://drive.google.com/drive/folders/${driveRootFolderId}`}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-block rounded-sm font-medium text-emerald-600 underline underline-offset-4 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        Google Drive 바로가기
      </a>
    ) : null}
  </footer>
);
