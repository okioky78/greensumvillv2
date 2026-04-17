<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Receipt image uploader

This app lets users upload and preview receipt images. The existing Google Drive upload function is kept so it can be moved to an OAuth-based flow.

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

The preview-only UI does not require Google API environment variables. The existing Drive upload function requires these values when called:

- `GOOGLE_DRIVE_ROOT_FOLDER_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY` (base64-encoded)
