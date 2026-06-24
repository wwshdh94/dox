# PreVault — Development Track

**Last updated:** 2026-06-24 (Activity & shares filters)

## Current status

**Phase:** Supabase auth + P1–P4 + **P5 account lifecycle** on Dev

Full PWA with Supabase Google OAuth + server-synced family doc metadata/files encrypted per Google account (`created_by`). Build and tests pass (239 tests).

## Completed

- [x] Planning — PLAN.md, market research, compliance, cost model
- [x] **Three-agent loop** — `.cursor/agents/` + `docs/AGENTIC_LOOP.md`
- [x] **Phase 0–4 MVP** — scaffold, theme, navigation, features
- [x] Vite 6 + React 19 + TypeScript + Tailwind v4 + vite-plugin-pwa
- [x] Family tab (default) + Assets tab + Profile → Settings
- [x] Dark / light / system theme
- [x] Demo Google auth + ToS/Privacy consent + onboarding
- [x] Family members, disable member, expiring banner
- [x] Assets: vehicle bundle, purchase/warranty cards, store tap-to-call
- [x] Upload flow: on-device OCR mock, verify, duplicate warning, store-only
- [x] Document detail: delete, notes, mark renewed, activity log, temp share link
- [x] Security Center, PIN lock
- [x] Visiting card editor + public page + vCard download
- [x] Temp share public page `/v/:token`
- [x] Vitest: 6 tests passing (incl. MemberDetailPage render regression)
- [x] Production build passing
- [x] **Bug fix:** Member detail infinite render loop — unstable Zustand selectors (`.filter()` in selector) fixed with `useMemo`; same pattern applied to Document/Asset detail pages
- [x] Document detail: original file preview (image/PDF) from `fileDataUrl`
- [x] Home FAB on Family + Assets tabs — upload, add note, scan with camera
- [x] Visual refresh — warm linen + ivory white accent (`#FFFEF9`), Instrument Serif + Plus Jakarta Sans, refined components
- [x] **Health tab** — family health profiles, emergency card, insurance expiry, lab/Rx/vaccination records
- [x] Back navigation on all sub-pages via Header ← button + smart route fallbacks
- [x] **Document tags** — domain (family/health/assets) + category; tab-scoped filtering
- [x] **Family tab Me | Family toggle** — Me shows owner vault inline; Family shows other members
- [x] **PreVault logo** — shield mark + full wordmark from `docs/logo/`; PWA/home-screen icons use mark only (`scripts/generate_app_icons.py`)
- [x] **Shared bundles** — FAB entry, save bundles, temp share links (`/p/:token`), activity log, print view with anti-crop watermark
- [x] **Backup & restore** — encrypted `.prevaultbackup` file + Google Drive upload/restore (`/profile/backup`)
- [x] **Member profiles** — phone, email, photo; invite to app (WhatsApp / email / copy link)
- [x] **Referrals** — free tier +3 uploads per referral (5 qualifying uploads), cap 15 bonus docs in logic; UI shows positive invite messaging only, limits in fine print (`/profile/referrals`)
- [x] **Free vs Pro limits** — `src/lib/planLimits.ts`: 10 verified docs, +2 family members, 3 assets, 1 bundle, 2 temp links; Pro unlocks unlimited + cloud AI, email reminders, visiting card, Drive backup (`/profile/plan`)
- [x] **Verification queue** — `src/lib/verificationQueue.ts`: pending docs staged on upload; free max 5 / Pro max 10 unverified; blocks new uploads until verified; UI shows "unlimited" for Pro verified storage
- [x] **Production doc cap** — `src/lib/documentLimits.ts`: hard 50 docs/member (all plans); `src/lib/adminNotify.ts` webhooks on cap; enforced in store + backup restore scan
- [x] **Admin dashboard** — passcode + owner email gate at `/admin`; **platform-wide** stats across all households (registry + events), not single-user vault
- [x] **UI uniformity** — consistent `page-main` / `surface-panel` / `backFallback` / `pb-28`+BottomNav patterns across pages; redundant footer back links removed
- [x] **Document field schemas** — fixed extracted fields per `DocType` in `src/lib/docFields.ts`; OCR/upload strip extras; notes for additional data; passport/PUC/insurance expiry fields; invoice warranty flow
- [x] **Share UX overhaul** — document share modals (WhatsApp/email/temp URL), transparent overlay, dimmed backdrop
- [x] **Profile Activity & shares** — `/profile/activity`: Active URLs filter, share activity + full log, creator attribution, auto-purge expired links, plan retention (30d/1y); **member / time / document filters** on all tabs
- [x] **Upload/camera defer UI** — FAB upload & scan open native picker/camera immediately; form shown only after file selected; cancel returns to previous tab
- [x] **Family home layout** — inline search placeholder, dismissible expiring banner, document pills with per-field Reveal/Hide (replaces Quick copy)
- [x] **Member doc stats** — home cards show total documents + due-soon count; health record pill removed from member vault panel
- [x] **Mobile typography** — `.page-main` uses smaller body text on phones; header + bottom nav unchanged
- [x] **Settings split** — Profile → **Appearance** (theme) vs **Account & reminders** (push/email, AI extraction, recovery code)
- [x] **Document pill icons** — flat lightweight PNGs in `public/icons/docs/` (~39KB total); title-keyword fallback for `other` docs (Bill, Card, Invoice, etc.); generator at `scripts/generate_doc_icons.py`
- [x] **Document pill layout** — tighter padding; icon fills left rail (`object-cover`); masked value + eye inline with `4ch` gap
- [x] **Brand theme** — navy (`#002040`) + gold (`#a08040`) palette aligned to logo assets
- [x] **Member avatars** — uploaded photo or gender + age portrait icons (Man/Woman/Boy/Girl/Old Man/Old Woman); DOB inferred from docs
- [x] **Expiring banner cooldown** — dismiss hides banner for 3 days; home "due soon" count opens filtered expiring list per member
- [x] **Document category filters** — Documents section on home/member pages: All, ID, Travel, Vehicle, Insurance pills (only categories with docs shown)
- [x] **Member detail = home layout** — `/family/:id` matches homepage Me view (search, banners, avatar, doc stats, category filters, FAB); shared via `MemberVaultView`
- [x] **Due soon filter pill** — member pages show warning-styled "Due soon" filter alongside ID/Travel/Vehicle/Insurance; clickable stats + expiring banner per member
- [x] **Document review status flow** — upload → OCR (`processing`) → home pill (`under_review`, orange) → user marks **Reviewed** (green) or **Rejected** (red) on document detail; share/expiry gated until reviewed (`src/lib/documentReview.ts`, store v6 migration)
- [x] **Camera photo editor** — after device camera capture: 4-corner crop, brightness/contrast/color sliders, HDR toggle; canvas export before upload (`src/components/ImageEditor.tsx`, `src/lib/imageEdit.ts`)
- [x] **Family document parity** — shared `DocumentPill` in search/expiring lists; member-scoped review banner; `canManageDocument` gates edit/share/review/archive on detail, upload, and store
- [x] **Admin desktop dashboard** (`feature/admin`) — `AdminLayout` + `AdminDesktopDashboard` (KPIs, trends, household table, events); `AdminMobileStats` for simple mobile KPIs; `AppLayout` bypasses lock/onboarding on `/admin*`; store `syncPlatformMetrics` on vault mutations
- [x] **Admin one-click actions** — per-household Email / Push / Update / Pro·Family·Free; broadcast panel; platform update inbox on Profile; webhook via `VITE_ADMIN_NOTIFY_WEBHOOK`
- [x] **User feedback** — `/profile/feedback` submit + private admin replies; admin inbox on dashboard with status (open → fixed/closed)
- [x] **Admin moderation** — block/unblock users (`/blocked` screen); grant Pro discounts shown on Plan page; admin routes lazy-loaded; no admin links in customer UI
- [x] **Admin Ops & Finance dashboard** — `/admin/analytics` with MRR/ARR estimates, conversion, support load, activity KPIs; tab nav from Platform dashboard
- [x] **On-device OCR (Aadhaar + PAN)** — Tesseract WASM (`tesseract.js`); card preprocess (grayscale/contrast); Verhoeff Aadhaar + PAN checksum/fixups; field parsers in `src/lib/idDocParser.ts`; upload + store pipeline pass `fileDataUrl`
- [x] **Cloud OCR (server)** — `POST /api/ocr/extract` (Vite dev + `VITE_OCR_API_URL` prod); OpenAI vision or Google Document AI text; 2 min timeout; upload **Cloud AI** mode; falls back to on-device
- [x] **Family manage — structure cards** — `/profile/family` household tree with generation colors; per-member invite on member page
- [x] **P3 encrypted Storage** — family doc files in `household-documents` bucket; AES-256-GCM keyed to **Google/Supabase user id** (`created_by`); recovery code flow removed for now
- [x] **Owner account lifecycle** — `/profile/account`: sign out, delete vault, delete account with ownership transfer; migration `007_p5_account_lifecycle.sql`
- [x] **Upload image pipeline** — single-image crop/enhance (`ImageEditor`); JPEG compress (~2400px, ≤1.2MB); automatic on-device vs cloud OCR (`ocrRoute.ts`); no user AI toggle on upload
- [x] **ImageEditor overlay fix** — crop dimming no longer covers full preview when cached images skip `onLoad`; layout measured via ResizeObserver + rAF
- [x] **Multi-page upload** — camera/gallery: edit each page, "Use & add another page", queue batch edits, upload all pages together for OCR
- [x] **On-device OCR v2** — Aadhaar Secure QR scan+decode (`aadhaarQr.ts`, jsQR, client-side gzip); PaddleOCR.js PP-OCRv5 primary + Tesseract `eng+hin` fallback; adaptive threshold preprocess (`ocrPreprocess.ts`); PAN entity-type validation; passport MRZ + DL field parsers; cloud AI unchanged (waiting)
- [x] **Doc-type ROI OCR** — user-selected type drives location-specific field crops (`ocrRegions.ts`); per-region Paddle/Tesseract; Aadhaar front/back page layouts; upload requires doc type for images; user-picked type wins over OCR inference
- [x] **Email reminders hidden** — removed from Profile/Settings/Plan UI; `emailReminders` forced off in store; Phase 3 email still in `PLAN.md`
- [x] **Input & upload limits** — `src/lib/inputLimits.ts`: file size (image 12MB, PDF 10MB), max 10 pages/doc, notes 2000 chars, title 120, feedback 4000; enforced in upload UI + vault store
- [x] **Production feature plan** — must / good / nice tiers in `PLAN.md` + `docs/PRODUCTION_MVP_GAP_ANALYSIS.md` (2026-06-23)
- [x] **Terms + Privacy pages** — `/terms`, `/privacy` (DPDP draft); public routes; linked from login consent, profile Help, referrals
- [x] **Manual document entry** — Settings → Document processing: Manual entry skips OCR; upload opens field form (`pending_details` status, not under review)
- [x] **Scheduled Google Drive backup** — Profile → Backup: daily/weekly auto upload to same Google account; account-key encryption; runs while app open
- [x] **Backup page UX** — status hero, Drive/file/restore cards, step progress panel, restore summary report, brand icons; account-key encryption (no passphrase)
- [x] **Profile page redesign** — hero with avatar/stats, 2×2 quick actions, preferences card, icon menu sections (Vault/Rewards/Account)

## In progress

- **UAT deploy + Security Chief RLS review** — two-account smoke on hosted Dev/UAT

## Next steps (production — by 2026-06-30)

1. **You:** Run `006_p4_launch_cohort_and_limits.sql` and `007_p5_account_lifecycle.sql` in Supabase SQL editor (after 001–005)
2. Two-account smoke: A uploads family doc → preview works after refresh on A and B (after share grant + join with `member` param on invite link)
3. Security Chief RLS review before UAT; Environment deploy Jun 29–30

## Blockers

- Supabase Dev project + Google OAuth credentials (human setup — see `docs/SUPABASE_SETUP.md`)
- Legal review for Aadhaar marketing
- Real WebAuthn PRF / E2E encryption deferred to Pro tier

## Decisions made

| Decision | Choice |
|----------|--------|
| Data (demo) | Zustand + localStorage persist |
| Auth (demo) | Simulated Google; Supabase ready via env |
| Extraction | On-device Tesseract OCR (Aadhaar/PAN); cloud behind Pro toggle |
| Agents | Manager → Developer → Tester loop; **production trio:** Environment, Architect, Security Chief (see `docs/AGENTIC_LOOP.md`) |
| **Supabase topology (2026-06-23)** | 3 isolated projects: dev / uat / prod |
| **Data residency (2026-06-23)** | Prod strict India — Mumbai (ap-south-1) |
| **Month-end sync (2026-06-23)** | Family documents + ACL on server; Assets/Health local; admin re-store only (no vault browse) |
| **Launch monetization (2026-06-23)** | ≤100 cohort; all Pro features; 50 docs/member; tasks → lifetime Pro; no Razorpay at launch |
| **Lifetime Pro tasks** | 6/8 tasks — 11 docs, 4 family, 2 admin-approved feedbacks; **first 100 users only** — `docs/LAUNCH_COHORT.md` |
| **Haptic feedback** | Android PWA via Vibration API; toggle in Appearance; iOS unsupported |
| **Welcome flow** | `/welcome` — 5-slide tour + cloud hero; guest explore before Google sign-in — `docs/WELCOME_FLOW.md` |

## Test results

```
npm test  — 235/235 pass
npm run build — success (PWA SW generated)
```

## Run

```bash
cd /Users/shdh94/projects/PreVault
npm install
npm run dev
```

Demo login → onboarding seeds sample family, vehicle, MacBook purchase.

## Notes for next agent

- Do not log document field values to console
- Avoid `.filter()` / `.find()` inside `useVaultStore` selectors — React 19 treats new array refs as store changes and can infinite-loop; select raw arrays and `useMemo` instead
- Read `docs/AGENTIC_LOOP.md` before multi-agent sessions
- Share target POST handler not yet wired in custom SW — use in-app upload for now
