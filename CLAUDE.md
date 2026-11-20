# CLAUDE.md — traduksyon-web

Next.js 14 (app router, TypeScript, Tailwind 3) frontend for **Traduksyon.io**. Backend: `../traduksyon-api`. Dev: `npm run dev` → http://localhost:3003 (API at `NEXT_PUBLIC_BACKEND_URL`, default http://localhost:8003).

## Auth (ported from winv-web)
- `src/lib/axios.ts` + `src/hooks/auth.ts` mirror winv-web's Breeze `useAuth` (SWR on `/api/user`, `csrf()` before every auth POST, 60s refresh). Added `register`. `returnUrl` is read from `window.location` (same-site paths only) instead of `useSearchParams`, so pages need no `<Suspense>`.
- `src/middleware.ts` redirects signed-out visitors to `/login?returnUrl=…` by checking the `traduksyon_session` cookie. **It must live in `src/`** — Next ignores a root-level `middleware.ts` when a `src/` dir exists (winv-web keeps its middleware at the root, so it is probably not running there).
- `src/app/(auth)` — login, register (starts 14-day trial), forgot-password, password-reset/[token], set-password/[token] (admin invitations). All use `AuthShell` (split brand panel on lg+, single column on phones).
- `src/app/(app)/layout.tsx` — authenticated shell + **subscription gate**: if `user.subscription.access` is false, every route except `/billing`, `/settings`, `/users`, `/payments` redirects to `/billing?expired=1`.

## Layout / responsiveness
- Phones: header + fixed `BottomNav` (Home / My meetings / Translate / Settings, matching the mobile mockup); modals are bottom sheets.
- `md`: icon-rail `Sidebar`; `lg+`: full sidebar with labels. Lists render as cards on phones and tables from `md`.
- Nav items + permission visibility: `src/components/layout/nav.ts`. `hasPermission()` in `src/utils/permissions.ts` treats Superadmin as all permissions (mirrors the API's `Gate::before`).

## Brand ("Friendly Teal")
Tokens in `tailwind.config.ts`: `primary` #0D9488 (CTA/active), `primary-hover`/`primary-deep` #0F766E, `primary-fresh` #14B8A6, `primary-mint` #CCFBF1, `dark` #142C3E (headings), `ink` #1E293B, `ai` #8B5CF6 (AI/summaries only), `canvas` #F8FAFC, `line` #E2E8F0, `body` #334155, `muted` #64748B, `success`/`warning`/`danger`. Font: Inter (`next/font`). Logo assets in `public/images` (`logo-mark.png` icon, `logo-full.png` for emails) were cut from the supplied logo with ImageMagick; the wordmark in the UI is rendered as text (`components/Logo.tsx`).

## PWA
`public/manifest.json`, hand-written `public/sw.js` (static cache-first, navigations network-first → `/offline`, never touches API calls — they are cross-origin anyway), icons in `public/icons`. The SW only registers in production builds (`ServiceWorkerRegister.tsx`); set `NEXT_PUBLIC_ENABLE_SW_IN_DEV=1` to test under `next dev`. Bump `CACHE_VERSION` in `sw.js` to purge old caches. `useInstallPrompt` powers the "Install app" row in Settings (iOS gets Share → Add to Home Screen instructions).

## Billing pages
`/billing` (status, plans, history), `/billing/return?payment=` (polls the API until the payment leaves `pending`), `/billing/checkout/[id]` (simulated checkout, only reached when the API runs `PAYMENT_DRIVER=fake`). `/payments` is the admin all-payments view. Money is in centavos; format with `formatMoney`. Dates use DD/MM/YYYY (`utils/format.ts`).

## Transcribe (`/meetings`) — added 2026-11-21
- `/meetings` lists transcriptions (polls every 4s while any are queued/processing); `?upload=1` opens the upload modal (Home's "Upload a recording" links there).
- `components/transcribe/UploadModal.tsx` — file (drag-drop, upload progress), title, language (Bicol/Masbateño flagged beta), speaker count, mode Verbatim vs Clean ("in toto"), optional names/keyterms. Options come from `GET /api/transcriptions/options`.
- `/meetings/[id]` — polls until done; audio player plus transcript "By speaker" (coloured Speaker A/B chips, click a word or timestamp to seek, current word highlighted; `SegmentRow` is memoised so playback re-renders only the active row) or "Plain text"; rename speakers, copy, download .txt, delete, retry on failure.
- **Edit a line**: pencil on each `SegmentRow` (hover on desktop, always visible on phones) → textarea, Save / Cancel / "Play this part", Ctrl+Enter / Esc. Saves via `PUT /api/transcriptions/{id}` `{segments:[{index,text}]}` and swaps in the returned transcription (`mutate(..., {revalidate:false})`); corrected rows show "edited". Copy/export pick up corrections automatically since they read `segments`.
- Helpers (timestamps, language labels, speaker colours, text export): `components/transcribe/helpers.ts`.
- **Export** (Download menu on `/meetings/[id]`): `components/transcribe/exportTranscript.ts` builds .docx (`docx`) / .pdf (`jspdf`) / .txt entirely in the browser, using current speaker names and the Timestamps toggle. Both libs are dynamic-imported so they only load on click. jsPDF uses built-in Helvetica (WinAnsi) — fine for Filipino/English incl. ñ, but non-Latin scripts would need an embedded TTF font.

- **Sticky elements under the header**: the app `Header` is `sticky top-0 z-30` and 64px tall (+ safe-area). Anything else sticky must offset by `top-[calc(4rem+env(safe-area-inset-top)+…)]` or it hides behind the header (e.g. meeting detail audio player, Speakers card).

## Not built yet
`/translate` and AI summaries are placeholders ("coming soon").
