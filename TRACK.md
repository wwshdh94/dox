# Dox — Development Track

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
- [x] **Dox logo** — nameless geometric abstract mark (`Logo` component, `public/logo.svg`, favicon)
- [x] **Shared bundles** — FAB entry, save bundles, temp share links (`/p/:token`), activity log, print view with anti-crop watermark
- [x] **Backup & restore** — encrypted `.doxbackup` file + Google Drive upload/restore (`/profile/backup`)
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
npm test  — 56/56 pass
npm run build — success (PWA SW generated)
```

## Run

```bash
cd /Users/shdh94/projects/Dox
npm install
npm run dev
```

Demo login → onboarding seeds sample family, vehicle, MacBook purchase.

## Notes for next agent

- Do not log document field values to console
- Avoid `.filter()` / `.find()` inside `useVaultStore` selectors — React 19 treats new array refs as store changes and can infinite-loop; select raw arrays and `useMemo` instead
- Read `docs/AGENTIC_LOOP.md` before multi-agent sessions
- Share target POST handler not yet wired in custom SW — use in-app upload for now
