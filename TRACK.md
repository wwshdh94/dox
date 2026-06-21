# PreVault — Development Track

**Last updated:** 2026-06-21

## Current status

**Phase:** MVP built — ready for user testing

Full PWA implemented in `src/` with demo auth (local-first). Build and tests pass.

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
- [x] Security Center, PIN lock, recovery code on onboarding
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
- [x] **Profile Activity & shares** — `/profile/activity`: Active URLs filter, share activity + full log, creator attribution, auto-purge expired links, plan retention (30d/1y)
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

## In progress

- Nothing

## Next steps (user testing)

1. Run `npm install && npm run dev` — walk through login → onboarding → Family/Assets
2. Test upload, temp share, visiting card, dark mode
3. Configure Supabase in `.env` for real Google OAuth + cloud sync
4. Legal review before production (Aadhaar/PAN)
5. Phase 2c: real cloud AI edge function (opt-in)
6. Share Target SW handler for Android installed PWA

## Blockers

- Supabase project not configured (demo mode only)
- Legal review for Aadhaar marketing
- Real WebAuthn PRF / E2E encryption deferred to Pro tier

## Decisions made

| Decision | Choice |
|----------|--------|
| Data (demo) | Zustand + localStorage persist |
| Auth (demo) | Simulated Google; Supabase ready via env |
| Extraction | On-device mock OCR; cloud behind Pro toggle |
| Agents | Manager → Developer → Tester loop |

## Test results

```
npm test  — 105/105 pass
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
