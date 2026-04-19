# ce:review 20260419-001

## Scope

- Branch: `feat/save-image`
- Base: `af4a151aa8862ac8d5b358942a65bdf513402c14`
- Mode: `interactive`
- Untracked files excluded: none
- Static check: `npm run lint` passed after safe fixes

## Intent

Add an OAuth-backed receipt image/PDF upload flow that stores original receipts in Google Drive branch folders and extracts payment dates via Gemini. OpenSpec artifacts in the diff still describe an atomic Drive plus Google Sheets save; the current implementation/README describe a Drive-only flow.

## Applied Fixes

- `server/google-drive/index.js`: paginated Drive child-folder listing instead of only reading the first 100 folders.
- `src/pages/receipt-drive-upload/model/useReceiptDriveFlow.ts`: added request invalidation guards so stale extraction/upload callbacks do not write into a reset, logged-out, or newer file-selection state.

## Synthesized Findings

| Severity | File | Issue | Reviewer(s) | Confidence | Route |
|---|---|---|---|---:|---|
| P1 | `netlify/functions/upload-to-drive.js:51` | Final save no longer writes Google Sheets receipt rows or enforces the atomic Drive+Sheets contract | correctness, api-contract, adversarial, kieran-typescript | 1.00 | `manual -> downstream-resolver` |
| P1 | `src/shared/imageUpload.ts:6` | PDF receipts are promised by the spec but rejected by client, parser, and filename validation | correctness, adversarial, kieran-typescript | 1.00 | `gated_auto -> downstream-resolver` |
| P1 | `server/google-oauth/index.js:191` | Refresh-token fallback can mix a new Google identity with a previous account's refresh token | security | 0.83 | `gated_auto -> human` |
| P1 | `netlify/functions/send-to-sheet.js:1` | `/api/send-to-sheet` was removed without a compatibility or deprecation path | api-contract | 0.99 | `advisory -> release` |
| P2 | `server/receipt-ai/index.js:24` | Google API calls have no explicit timeout/deadline | reliability | 0.79 | `gated_auto -> human` |
| P2 | `server/google-drive/index.js:71` | Branch-folder/root-access logic lacks focused automated coverage | testing | 0.96 | `manual -> downstream-resolver` |
| P2 | `server/google-oauth/index.js:169` | OAuth callback/session-refresh flow lacks focused automated coverage | testing | 0.94 | `manual -> downstream-resolver` |

## Agent-Native Gaps

- No agent tool layer, system prompt wiring, or shared runtime context was found for login/logout, branch listing, payment-date extraction, or Drive upload.
- Browser-origin checks are appropriate for CSRF protection, but a future agent primitive would need a server-side authenticated entry point rather than direct browser-origin-gated calls.

## Learnings

- No `docs/solutions/` directory or critical-patterns document was present in this checkout, so no past solution documents were available for this review.

## Coverage

- Suppressed/demoted: the duplicate upload round-trip was treated as a product/UX tradeoff rather than a blocking performance defect.
- Residual risks: auth UI state is bootstrapped from localStorage until API calls prove the cookie session; token refresh cookies are only persisted on successful requests.
- Testing gaps: no E2E coverage for PDF upload, Drive+Sheets atomic save, stale async UI callbacks, Google timeout behavior, or auth account-switching.

## Verdict

Not ready.

Primary fix order: restore or intentionally revise the Drive+Sheets contract, support or explicitly de-scope PDFs, bind refresh tokens to the verified Google subject, then add targeted tests for OAuth and Drive folder behavior.
