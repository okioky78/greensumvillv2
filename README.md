<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4a223d4f-5ec2-4b3f-9237-44cd235c1fa4

## Run Locally

**Prerequisites:** Node.js, Netlify CLI

1. Install dependencies:
   `npm install`
2. Install and authenticate Netlify CLI:
   `npm install -g netlify-cli`
   `netlify login`
3. Set the `VITE_GEMINI_API_KEY` in `.env.local`
4. Set the following Netlify/local environment variables for Google Sheets and Google Drive:
   `GOOGLE_SHEET_ID`
   `GOOGLE_DRIVE_ROOT_FOLDER_ID`
   `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   `GOOGLE_PRIVATE_KEY` (base64-encoded)
5. Enable Google Drive API in the same Google Cloud project and share the parent Drive folder plus its branch subfolders with the service account as an editor
6. Make sure each branch in the app has a direct child folder with the exact same name under the parent Drive folder
7. Add a dedicated Drive link column (for example `증빙파일`) after the existing Google Sheet columns
8. Run the app:
   `npm run dev`

`npm run dev` starts Netlify Dev on `http://localhost:8888` and proxies the Vite app plus Netlify Functions so `/api/send-to-sheet` uses the same function locally and in production.
