# PreVault — Production MVP Gap Analysis

**Target:** Production MVP by **2026-06-30** (month end)  
**As of:** 2026-06-23  
**Tests:** 220/220 pass | **Build:** PWA succeeds  
**Scope:** Document vault + family sharing on Supabase (not auth-only demo hosting)

---

## Executive summary

The app is a **feature-rich PWA** with strong UX, OCR, admin, and backup flows. **Supabase auth, encrypted Storage, and household sync are implemented on Dev** — Prod is blocked on **hosted deploy, UAT sign-off, legal pages, and RLS audit**, not on rebuilding core tabs.

**Month-end MVP (product-faithful):** **Auth + household + encrypted Storage + family ACL sync + hosted PWA (Dev/UAT/Prod)** — the minimum that matches “document vault + family sharing.”

**Defer to post-launch:** email reminders, Share Target SW, Razorpay billing, visiting card NFC, **Assets/Health server sync** (Family docs sync is in scope).

**Locked product decisions (2026-06-23):** three Supabase projects; **India region (Mumbai) for Prod**; Family docs encrypted on server with household-only RLS (admin re-store only, no content access); launch cohort ≤100 with all Pro features + 50-doc cap; task-based lifetime Pro instead of billing at launch.

---

## Production feature tiers (2026-06-23)

See also [PLAN.md](../PLAN.md) § Production feature plan.

### Must-have for Prod

| Category | Items |
|----------|--------|
| **Infra** | 3 Supabase projects; hosted PWA; demo auth off on Prod; OCR API deployed; migrations 006–007; CI test+build |
| **Vault proof** | Two-account UAT smoke; encrypt→Storage→preview; 50-doc server cap; RLS PASS; share grants ACL |
| **Legal** | `/terms`, `/privacy`, grievance officer; Aadhaar legal sign-off; no PII in logs |
| **Flows** | Signup→upload→verify→review→share→backup→delete on hosted Prod |
| **Cohort** | ≤100 server cap; lifetime Pro sync; OCR rate limits |

### Good to have (launch +1–2 weeks)

Push reminders (backend), RC/Insurance OCR, verify confidence UI, Share Target SW, error monitoring, landing page, launch tasks server sync, OCR golden set, ImageEditor→OCR deskew, beta households.

### Nice to have (post-launch)

Email reminders, Razorpay, Assets/Health server sync, WebAuthn PRF, DigiLocker, Hindi UI, visiting card NFC, WhatsApp bot, TWA, fleet admin.

---

## What is already strong (reuse in production)

| Area | Status |
|------|--------|
| PWA shell, routing, dark mode | Done |
| Family / Assets / Health tabs | Done |
| Upload → OCR → verify → review flow | Done |
| On-device OCR v2 (QR, PaddleOCR, ROI, MRZ/DL) | Done |
| Google OAuth + Supabase household | Done (Dev) |
| Encrypted Storage + doc sync | Done (Dev — P3) |
| Family ACL logic + `share_grants` sync | Done (client + server code; UAT proof pending) |
| Member invite UX | Done — needs two-account UAT |
| Cloud OCR handler | Needs deploy + `VITE_OCR_API_URL` |
| Temp share, bundles, backup export | Done (local); verify hosted |
| Admin dashboard | Done (env-gated) |
| Launch cohort + 50-doc cap | Client done; migration 006 pending |
| Account lifecycle (P5) | Done; migration 007 pending |
| Input/upload limits | Done |
| Vitest coverage | 220 tests |
| Security Center UI, PIN lock | Done (client-only) |
| Terms/Privacy **pages** | **Missing** — consent checkbox only |

---

## Critical gaps (block Prod)

### P0 — Must fix for launch

| Gap | Risk | Effort | Owner agent |
|-----|------|--------|-------------|
| **UAT + Prod hosted deploy** | Users cannot access vault | S | Environment |
| **Two-account family smoke on UAT** | Sharing unproven | S | Tester |
| **Terms + Privacy pages** (`/terms`, `/privacy`) | DPDP consent gap | S | Developer |
| **Migrations 006 + 007 on Supabase** | Cohort + lifecycle not enforced server-side | S | Architect |
| **RLS audit PASS** | Cross-household leak risk | M | Security Chief |
| **Demo mode off on Prod** (`VITE_DEMO_AUTH=false`) | Misleading “cloud vault” | S | Environment |
| **Legal review** (TRACK blocker) | Aadhaar/PAN liability | M (human) | Security Chief |
| **OCR API not deployed** | Cloud AI broken outside dev | S | Environment |
| **CI: test + build on PR** | Regressions | S | Environment |

**Resolved since initial gap doc (no longer P0):** real Google OAuth; Supabase household; encrypted Storage upload; share_grants sync code; account lifecycle UI.

### P1 — Should have for credible launch

| Gap | Risk | Effort |
|-----|------|--------|
| `share_grants` verified end-to-end on UAT | Wrong family access | S |
| Separate Dev / UAT / Prod projects | Config bleed | S |
| Error monitoring (no PII) | Blind failures | S |
| Admin hard-gated in Prod | Attack surface | S |
| Push reminders backend | Core loop incomplete | M |
| RC + Insurance OCR schemas | Phase 2 exit | M |
| Grievance officer published | DPDP | S |

### P2 — Defer post-launch

| Item | Why defer |
|------|-----------|
| WebAuthn PRF | Complex; phased after Storage |
| **Email** reminders | Phase 3; UI hidden |
| Share Target SW handler | Android PWA install only |
| Full Assets + Health server sync | Ship Family domain first |
| DigiLocker, Hindi, visiting card NFC | Phase 5–6 |
| Razorpay billing | Launch cohort: tasks → lifetime Pro |
| OCR golden eval program | On hold |

---

## Month-end MVP — in scope

1. **Three environments** — Dev, UAT, Prod ([environment.md](../.cursor/agents/environment.md))
2. **Supabase** — **3 isolated projects** (not branches); Google OAuth; **Prod in Mumbai (ap-south-1)**
3. **Schema** — `households`, `household_members`, `profiles`, `documents`, `share_grants`
4. **Encrypted Storage** — Family doc files + metadata; remove `fileDataUrl` from persist for synced docs
5. **Family sharing** — invite accept → member; RLS enforces `documentVisibility`; **no admin read of doc content**
6. **Admin re-store** — support can push encrypted backup to user (disaster recovery); metadata audit only
7. **User backups** — Google Drive + on-device (existing flows) alongside server sync
8. **Hosted PWA** — Vercel/Cloudflare; `VITE_*` per env; demo auth off on Prod
9. **OCR API** — deploy handler; `VITE_OCR_API_URL` on UAT/Prod
10. **Launch cohort** — ≤100 members; all Pro features on; **50 docs/member** cap enforced server + client
11. **Security minimum** — RLS on all tables, Aadhaar masked, HTTPS, no secrets in git
12. **UAT sign-off** → Prod promote ([tester.md](../.cursor/agents/tester.md))

### Out of scope for month-end (explicit)

- Real push notifications
- Razorpay / paid subscriptions (task-based lifetime Pro instead)
- Assets/Health tab server sync
- Admin vault browsing or plaintext document access
- Legal sign-off for Aadhaar **marketing campaigns** (in-app masking still required)

---

## Suggested execution plan (Jun 23 → Jun 30)

| Window | Focus | Exit criteria |
|--------|-------|---------------|
| **Jun 23–24** | Supabase projects (×3), OAuth, schema v1, RLS draft | Dev login works |
| **Jun 25–26** | Household bootstrap, member invite/join, metadata sync | Two Google accounts in one household on Dev |
| **Jun 27–28** | Storage upload, client encrypt, drop `fileDataUrl`; `share_grants` | Upload/preview + family ACL on Dev |
| **Jun 29** | UAT deploy, OCR API, CI gates, Security Chief review | Tester smoke on UAT |
| **Jun 30** | UAT PASS → Prod promote, post-deploy smoke | Prod live with demo auth off |

Agents: **Architect** (build), **Security Chief** (RLS/encrypt gates), **Environment** (deploy/promotion).

---

## Environment checklist (first-time setup)

- [ ] Create `prevault-dev`, `prevault-uat`, `prevault-prod` Supabase projects (**Prod: Mumbai / ap-south-1**)
- [ ] Google OAuth clients per environment (authorized origins)
- [ ] GitHub Environments: `development`, `uat`, `production` with secrets
- [ ] Branches: `develop` → `staging` → `main`
- [ ] UAT URL shared with testers only
- [ ] Prod: `VITE_DEMO_AUTH=false`, admin owner email set

---

## Risk register

| Risk | Mitigation |
|------|------------|
| `useVaultStore` migration complexity | One phase per PR; Family docs domain first |
| Users expect instant multi-tab sync | TanStack Query + optimistic UI |
| OCR cost abuse | Rate limit API; launch cohort cap 100 users |
| Admin support needs doc access | Re-store encrypted backup only; RLS denies admin read |
| India residency drift | Environment agent verifies Prod region at project create |
| Aadhaar compliance | Mask UI; no analytics; legal review parallel track |
| Month-end slip | Ship UAT beta Jun 30; Prod Jun 30 evening only if UAT PASS |

---

## Success criteria (month-end MVP)

- [ ] Owner signs in with Google; household created on server
- [ ] Second member accepts invite; sees only permitted docs
- [ ] Upload → encrypt → Storage → preview works on UAT and Prod
- [ ] On-device OCR + verify + review flow on hosted build
- [ ] Cloud OCR on UAT (Pro features on for launch cohort)
- [ ] 50-doc cap enforced on server for a member
- [ ] Admin cannot list/decrypt another user's documents (RLS audit)
- [ ] RLS audit: **PASS** or **CONDITIONAL** from Security Chief
- [ ] Tester **PASS** on UAT before Prod deploy
- [ ] TRACK.md updated with env URLs and blockers

---

## How to invoke agents in parallel

```
You (product owner)
 ├── @environment  — deploy, env vars, promotion
 ├── @architect    — schema, auth, migrations, Storage
 └── @security-chief — RLS, encryption, compliance gate
```

Feature implementation uses **Manager → Developer → Tester** from [AGENTIC_LOOP.md](./AGENTIC_LOOP.md).
