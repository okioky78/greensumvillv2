<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Receipt image uploader

영수증 이미지를 선택하거나 드래그앤드롭한 뒤, 결제일과 학생 이름을 기준으로 Google Drive에 저장하는 앱입니다. Google Drive 저장은 서비스 계정이 아니라 로그인한 Google 사용자의 OAuth 권한으로 동작합니다.

View your app in AI Studio: https://ai.studio/apps/4a223d4f-5ec2-4b3f-9237-44cd235c1fa4

## Run Locally

**Prerequisites:** Node.js, Netlify CLI

1. Install dependencies:
   `npm install`
2. Install and authenticate Netlify CLI:
   `npm install -g netlify-cli`
   `netlify login`
3. Run the app:
   `npm run dev`

`npm run dev` starts Netlify Dev on `http://localhost:8888` and proxies the Vite app.

로컬에서는 `.env.example`을 복사해 `.env`를 만들고 실제 값을 채워 주세요.

## Required Environment Variables

Netlify Functions에서 사용할 변수는 Netlify UI/CLI의 Functions scope에 설정해야 합니다. 로컬에서는 `.env`에 둘 수 있습니다.

- `GOOGLE_OAUTH_CLIENT_ID`: Google Cloud Console에서 만든 OAuth client ID
- `GOOGLE_OAUTH_CLIENT_SECRET`: OAuth client secret
- `GOOGLE_OAUTH_REDIRECT_URI`: OAuth callback URI
- `GOOGLE_OAUTH_COOKIE_SECRET`: OAuth 세션 쿠키 암호화용 비밀값
- `APP_ORIGIN`: 앱 origin. 로컬 예시는 `http://localhost:8888`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID`: 지점 폴더들이 들어있는 Google Drive 부모 폴더 ID
- `GEMINI_API_KEY`: 결제일 추출에 사용할 Gemini API key

로컬 OAuth redirect URI 예시:

```text
http://localhost:8888/api/google-auth-callback
```

배포 후에는 배포 도메인 기준 callback URI도 Google Cloud Console의 Authorized redirect URIs에 추가해야 합니다.

## Google OAuth Notes

로그인 사용자 확인에는 Google이 발급한 OpenID Connect `id_token`을 사용합니다. 로그인 callback에서 `GOOGLE_DRIVE_ROOT_FOLDER_ID` 폴더 접근 권한을 확인하며, 권한이 없는 Google 계정에는 앱 세션 쿠키를 발급하지 않습니다.

Drive 폴더 목록 조회와 기존 폴더 업로드를 위해 `https://www.googleapis.com/auth/drive` scope를 사용합니다. Drive scope는 넓은 권한이므로 공개 앱으로 운영하려면 Google 검증이 필요할 수 있습니다. 내부용 또는 테스트 사용자 기반 운영이라면 Google Cloud Console의 OAuth 테스트 사용자에 실제 사용자를 추가해 사용합니다.

실제 OAuth 세션과 Google API 토큰은 `HttpOnly` 암호화 쿠키에 저장합니다. 프론트엔드는 로그인 UI 표시용으로만 `localStorage`의 `greensum_logged_in=authenticated` 값을 확인하며, 실제 API 권한 판단은 서버의 OAuth 세션/토큰 검증으로만 처리합니다.

## Reusable Structure

서버의 OAuth/Drive 로직은 Netlify 함수에 직접 묶지 않고 `server/` 아래 공통 모듈로 분리되어 있습니다.

- `server/google-oauth`: Google 로그인, callback, Google `id_token` 검증, 암호화된 HttpOnly 세션 쿠키, 토큰 갱신
- `server/google-drive`: Drive 클라이언트, 지점 폴더 조회, 파일 업로드, 롤백
- `server/receipt-ai`: Gemini 기반 결제일 추출
- `server/shared`: API 응답/오류, multipart 업로드 파싱, 안전한 파일명 생성

향후 Next.js로 옮길 때는 이 모듈들을 Node Route Handler에서 호출하고, 해당 route에 `runtime = "nodejs"`를 명시해야 합니다.

프론트엔드의 이미지 선택/드롭존과 preview 생성/해제도 `src/shared` 유틸로 분리되어 있어 다른 작은 앱으로 옮기기 쉽습니다.

## Removed Service Account Flow

활성 업로드 흐름에서는 더 이상 아래 서비스 계정 변수를 사용하지 않습니다.

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEET_ID`

Google Sheets 저장, 전체 영수증 분석, PDF 업로드는 현재 범위에 포함하지 않습니다.
