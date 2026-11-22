# CLAUDE.md — traduksyon-web

Next.js 14 (app router, TypeScript, Tailwind 3) frontend for **Traduksyon.com**. Backend: `../traduksyon-api`. Dev: `npm run dev` → http://localhost:3003 (API at `NEXT_PUBLIC_BACKEND_URL`, default http://localhost:8003).

## Auth (ported from winv-web)
- `src/lib/axios.ts` + `src/hooks/auth.ts` mirror winv-web's Breeze `useAuth` (SWR on `/api/user`, `csrf()` before every auth POST, 60s refresh). Added `register`. `returnUrl` is read from `window.location` (same-site paths only) instead of `useSearchParams`, so pages need no `<Suspense>`.
- `src/middleware.ts` redirects signed-out visitors to `/login?returnUrl=…` by checking the `traduksyon_session` cookie. **It must live in `src/`** — Next ignores a root-level `middleware.ts` when a `src/` dir exists (winv-web keeps its middleware at the root, so it is probably not running there).
- `src/app/(auth)` — login, register (sends confirmation email; free credits are given on confirm), verify-email/[id]/[hash], forgot-password, password-reset/[token], set-password/[token] (admin invitations). All use `AuthShell` (split brand panel on lg+, single column on phones).
- **Email confirmation** (2026-11-21): `register()` no longer signs in — it resolves to the email and the register page swaps to a "Check your inbox" view. Login shows the `unverified` sentinel with a resend button; `?verified=1` shows a success note. `/verify-email/[id]/[hash]` forwards path + query to the API's `GET /email/verify/…` (runs once via a ref, StrictMode-safe). `(auth)/ResendVerification.tsx` is the shared resend form. `/verify-email` is in the middleware's public prefixes.
- **Logout** always calls `csrf()` then `POST /logout` (retrying once on 419), whatever the SWR `error` state. A silently failed logout leaves the session and remember-me cookie in place, and `/login` sends the user straight back to `/home`.
- `src/app/(app)/layout.tsx` — customer workspace shell. **No access gate** since the switch to credits (2026-11-23): everything stays viewable, and the API refuses new jobs with 402 `insufficient_credits`.

## Layout / responsiveness
- Phones: header + fixed `BottomNav` (Home / My meetings / Translate / Settings, matching the mobile mockup); modals are bottom sheets.
- `md`: icon-rail `Sidebar`; `lg+`: full sidebar with labels. Lists render as cards on phones and tables from `md`.
- Nav items + permission visibility: `src/components/layout/nav.ts`. `hasPermission()` in `src/utils/permissions.ts` treats Superadmin as all permissions (mirrors the API's `Gate::before`).

## Brand ("Friendly Teal")
Tokens in `tailwind.config.ts`: `primary` #0D9488 (CTA/active), `primary-hover`/`primary-deep` #0F766E, `primary-fresh` #14B8A6, `primary-mint` #CCFBF1, `dark` #142C3E (headings), `ink` #1E293B, `ai` #8B5CF6 (AI/summaries only), `canvas` #F8FAFC, `line` #E2E8F0, `body` #334155, `muted` #64748B, `success`/`warning`/`danger`. Font: Inter (`next/font`). Logo assets in `public/images` (`logo-mark.png` icon, `logo-full.png` for emails) were cut from the supplied logo with ImageMagick; the wordmark in the UI is rendered as text (`components/Logo.tsx`).

## PWA
`public/manifest.json`, hand-written `public/sw.js` (static cache-first, navigations network-first → `/offline`, never touches API calls — they are cross-origin anyway), icons in `public/icons`. The SW only registers in production builds (`ServiceWorkerRegister.tsx`); set `NEXT_PUBLIC_ENABLE_SW_IN_DEV=1` to test under `next dev`. Bump `CACHE_VERSION` in `sw.js` to purge old caches. `useInstallPrompt` powers the "Install app" row in Settings (iOS gets Share → Add to Home Screen instructions).
- **`/install`** (public, in the middleware's `PUBLIC_PREFIXES`; added 2026-11-22) is the landing page for the marketing site's "Install app" buttons: one **Install Traduksyon** button that opens the native dialog. Browsers only allow `prompt()` from the app's own origin and after a click on it, so the marketing site can't open the dialog itself. Visitors from the marketing site need two clicks: the link, then this button. Safari (iOS/macOS) and Firefox have no install API, so `platform` from the hook picks manual steps. Chrome/Edge show "Getting ready…" for 3.5s, then a menu hint. That hint also covers the case where the app is already installed, because then the browser never fires the event.
- `beforeinstallprompt` can fire before hydration, so an inline script in `app/layout.tsx` stores it on `window.__installPrompt` and dispatches `installpromptready`. `useInstallPrompt` reads it from there. The event only fires on HTTPS (or localhost) when the SW is registered, which means production builds or `NEXT_PUBLIC_ENABLE_SW_IN_DEV=1`.

## Credits (prepaid) — replaced trial + subscription on 2026-11-23
- `user.credits` from `/api/user` = `{balance, exempt, low, costs:{transcription_per_minute, minutes, report}}` (`CreditState`). Staff (`exempt`) are never charged and see no balance UI.
- Header shows a balance chip linking to `/billing`. `components/layout/CreditBanner.tsx` replaced `TrialBanner` (shows when `low` or ≤ 0).
- `components/CreditCostNote.tsx` = "This will use N credits · you have M" (amber + **Buy credits** → `/billing?topup=1` when short). Used in UploadModal, CreateMinutesModal (recording = audio + minutes), CreateReportModal and both Regenerate modals.
- `utils/credits.ts`: `transcriptionCost()` mirrors the API rule (per started minute); `readMediaDuration()` reads a picked file's length in the browser for the estimate (null if it can't; the server re-probes anyway); `formatCredits()`.
- After anything that charges (create, retry, regenerate), call `mutate('/api/user')` so the header balance updates.
- Admin users page: credits badge + **Add / remove credits** (`AdjustCreditsModal` → `POST /api/users/{id}/credits`), replacing "Extend access".

## Billing pages
`/billing` = **Credits** page (balance, what things cost, credit packs, credit history ledger, payment history), `/billing/return?payment=` (polls the API until the payment leaves `pending`), `/billing/checkout/[id]` (simulated checkout, only reached when the API runs `PAYMENT_DRIVER=fake`). `/admin/payments` is the admin all-payments view. Money is in centavos; format with `formatMoney`. Dates use DD/MM/YYYY (`utils/format.ts`).

## Transcribe (`/meetings`) — added 2026-11-21
- `/meetings` lists transcriptions (polls every 4s while any are queued/processing); `?upload=1` opens the upload modal (Home's "Upload a recording" links there).
- `components/transcribe/UploadModal.tsx` — file (drag-drop, upload progress), title, language (Bicol/Masbateño flagged beta), speaker count, mode Verbatim vs Clean ("in toto"), optional names/keyterms. Options come from `GET /api/transcriptions/options`.
- `/meetings/[id]` — polls until done; audio player plus transcript "By speaker" (coloured Speaker A/B chips, click a word or timestamp to seek, current word highlighted; `SegmentRow` is memoised so playback re-renders only the active row) or "Plain text"; rename speakers, copy, download .txt, delete, retry on failure.
- **Change who said a line**: the speaker chip on each `SegmentRow` is a `SpeakerPicker` menu that lists the existing speakers plus "New speaker (Speaker X)" (`nextSpeakerId` picks the first unused letter). It calls `saveSegment(index, { speaker })`, the same `PUT segments` call as text corrections (`SegmentPatch = { text?, speaker? }`). This only affects that line. The sidebar "Rename" modal renames a speaker everywhere. The menu fits the window: on open it measures the space below the chip (minus the 64px header and the phone BottomNav), flips upward when there's much more room above, and only the speaker list scrolls. The header and "New speaker" stay visible.
- **Edit a line**: pencil on each `SegmentRow` (hover on desktop, always visible on phones) → textarea, Save / Cancel / "Play this part", Ctrl+Enter / Esc. Saves via `PUT /api/transcriptions/{id}` `{segments:[{index,text}]}` and swaps in the returned transcription (`mutate(..., {revalidate:false})`); corrected rows show "edited". Copy/export pick up corrections automatically since they read `segments`. Opening the editor pauses the audio (`onEditStart`); Save resumes playback only if it was playing when editing began (`onEditSaved`, tracked in `resumeAfterEditRef`). Cancel leaves it paused.
- **Split a line between two speakers** (2026-11-22): the scissors action on a `SegmentRow` opens split mode. The words become buttons; tapping one puts a teal divider before it and tints the rest in the chosen speaker's colour. A `SpeakerPicker` (with its `label`/`title` props, and `onPick` setting local state) chooses who said the second part. It defaults to the first other speaker, or to a new one. A new id that isn't saved yet is added to a preview speaker list so it gets its own colour. "Split line" sends `PUT {split:{index, at, speaker}}`. The ⤒ action (`ArrowUpToLine`, rows after the first) sends `{merge:{index}}` to undo. Row actions show on hover on desktop and always on phones. Split mode pauses and resumes the audio the same way the editor does. Rows are keyed `${i}:${start}:${end}` so the rows below a split or merge remount with fresh state.
- Helpers (timestamps, language labels, speaker colours, text export): `components/transcribe/helpers.ts`.
- **Export** (Download menu on `/meetings/[id]`): `components/transcribe/exportTranscript.ts` builds .docx (`docx`) / .pdf (`jspdf`) / .txt entirely in the browser, using current speaker names and the Timestamps toggle. Both libs are dynamic-imported so they only load on click. jsPDF uses built-in Helvetica (WinAnsi) — fine for Filipino/English incl. ñ, but non-Latin scripts would need an embedded TTF font.

- **Sticky elements under the header**: the app `Header` is `sticky top-0 z-30` and 64px tall (+ safe-area). Anything else sticky must offset by `top-[calc(4rem+env(safe-area-inset-top)+…)]` or it hides behind the header (e.g. meeting detail audio player, Speakers card).
- **Z-index layers**: sticky cards `z-20` < dropdown menus `z-[25]` < Header `z-30` < BottomNav `z-40` < Modal `z-50`. A dropdown at the same `z-20` as the sticky audio player renders underneath it, because the player comes later in the page.

## Minutes of meeting (`/minutes`) — added 2026-11-21
- Home "Your workflow" item (order: Transcribe, Minutes, Summarize, Translate) + sidebar nav item (not in the phone BottomNav, which is capped at 4). `/minutes?transcription=ID` opens the create dialog with that transcript preselected (the purple "Minutes" button on `/meetings/[id]` links there); `?new=1` just opens it.
- `components/minutes/CreateMinutesModal.tsx` — source "From a transcript" (dropdown from `GET /api/minutes/options`, includes still-transcribing ones) or "From a recording" (upload; always sent with `mode=clean`), title, output language (English/Filipino), optional extra context.
- `/minutes/[id]` polls while `waiting`/`queued`/`processing`; view (summary, discussion, decisions, action items table → cards on phones, attendees + next meeting sidebar), Edit (`MinutesEditor.tsx`: rows for attendees/action items, one-item-per-line textareas for discussion/decisions; PUT sends the full `content`), Copy, Download, Regenerate (overwrites edits — warns), Delete (keeps the transcript).
- Export: `components/minutes/exportMinutes.ts` (.docx with action-items table, .pdf, .txt via `minutesToText`). Shared `components/ui/DownloadMenu.tsx` (moved out of the meeting page) is used by both pages.
- **Full English / Full Tagalog**: the create dialog shows them as two radio cards. Headings in the view, Copy and all downloads come from `minutesLabels(output_language)` in `components/minutes/helpers.ts` (e.g. Buod, Mga napagpasyahan, Mga gawain), so Tagalog minutes have no English headings. Add a language there and in the API's `config/minutes.php` together.
- Purple `ai` tone is used throughout, since this is an AI feature.

## Committee reports (`/reports`) — added 2026-11-21
- Home's **Summarize** item → `/reports` (sidebar "Committee reports", not in the phone BottomNav). Purple `ai` tone.
- `components/reports/CreateReportModal.tsx` — source "From minutes of meeting" (default) or "From a transcript", title, Full English / Full Tagalog, optional "Committee details" (committee name, report no., addressed to, members). `/reports?minutes=ID` / `?transcription=ID` preselect a source; the purple **Committee report** button on `/minutes/[id]` links there.
- `/reports/[id]` renders the report in the **Sangguniang Panlungsod "Details of the Committee Report" format** (2026-11-22; the cover page was removed at the user's request): DETAILS OF THE COMMITTEE REPORT NO. ____, (TO:, referral, I. Background, II. Findings and Observations as "**On X.** text", III. Committee Recommendations, IV. Committee Action, Recommendation, committee + signatures). Plus Edit (`ReportEditor.tsx`), Copy, Download, Regenerate (hidden when the source was deleted), Delete.
- Headings **and the fixed boilerplate sentences** (findings and recommendations lead-ins, default TO:) come from `reportLabels(lang)` in `components/reports/helpers.ts`, eng + fil. `reportNoLine()` (blank `________` when no number), `findingTopic()`, `paragraphs()` and `reportToText()` are shared by the view, Copy and exports.
- Export: `components/reports/exportReport.ts` — .docx and .pdf in the same layout, signatures right-aligned. .txt = `reportToText()`.
- The API converts old-shape reports on read, so the web only knows the new `ReportContent`.
- **PDF exports replace `₱` with `PHP `** (reports and minutes): jsPDF's built-in Helvetica has no peso glyph.

## Not built yet
`/translate` is a placeholder ("coming soon").

## Branding
- Product name is **Traduksyon.com** (renamed from Traduksyon.io, 2026-11-21). Hard-coded in `app/layout.tsx` metadata, `AuthShell`, `Logo` alt, `public/manifest.json`, and the export helpers (docx `creator` + PDF footer). `logo-full.png` / `logo-mark.png` are images — check them if the wordmark shows the domain.

## Customer workspace vs Admin console — added 2026-11-22
- **Two shells in one app**, so they share the login session, `useAuth` and `components/ui`:
  - `src/app/(app)/*` — customer workspace (Home, Transcribe/meetings, Minutes, Committee reports, Translate, Credits, Settings = own profile). Nav in `components/layout/nav.ts`. A customer (role `User`) sees nothing else.
  - `src/app/(admin)/admin/*` — admin console with its own dark sidebar (`components/admin/AdminSidebar.tsx`; `AdminTabs` on phones), no bottom nav. Pages: `website` (marketing content), `inquiries` (contact-form leads), `users`, `payments`. Per-page permissions are in `components/admin/nav.ts` (`website.manage`, `users.access`, `billing.view_all_payments`). `canUseAdmin(user)` = has at least one of those, and drives the "Admin console" link in the sidebar, account menu and Settings. `/admin` redirects to the first allowed page.
- `/users` and `/payments` moved to `/admin/users` and `/admin/payments`; `next.config.mjs` has permanent redirects for old bookmarks.
- Put new admin-only pages in `(admin)/admin/` and add them to `ADMIN_NAV`. Don't add them to `NAV_ITEMS`.
- **Website editor** (`/admin/website`): forms are generated from the API's `SiteSchema` (`components/admin/site/FieldInput.tsx` handles every field type, including reorderable `list` rows and the icon picker). Per-section drafts, unsaved-change dots, a beforeunload warning, Save / Discard / Restore default. Icon map: `components/admin/site/icons.ts`, which must match `SiteSchema::ICONS`.
- `NEXT_PUBLIC_MARKETING_URL` — AuthShell links back to the marketing site.
- `Logo.tsx` wordmark fixed from `.io` to `.com`.
