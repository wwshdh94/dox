# PreVault — Agent Instructions

**PreVault** is a privacy-first **Document Vault PWA** for Indian households. Users share documents from their phone (gallery, WhatsApp, email), AI extracts structured fields, they verify once, and the app tracks expiry with reminders. Family sharing and biometric app lock are core.

See [PLAN.md](./PLAN.md) for market research, architecture, and phased roadmap. See [TRACK.md](./TRACK.md) for current development status.

---

## Product summary

| Area | Direction |
|------|-----------|
| **Platform** | Installable PWA (Android Chrome + iOS Safari Add to Home Screen) |
| **Primary market** | India — Aadhaar, PAN, Passport, RC, PUC, Insurance, Degree, etc. |
| **Differentiator** | Family-first UX + Assets tab + optional AI + expiry reminders + temp share |
| **Security** | E2E encryption, WebAuthn biometric unlock, **Security Center** UI, zero-knowledge where possible |
| **Auth** | **Google Sign-In** (Supabase OAuth) + Terms/Privacy consent at signup |
| **Monetization** | Freemium — free tier (limited docs/reminders); Pro (unlimited + family + visiting card); Family plan (sharing) |

---

## Core user flows

1. **Home (Family tab)** — Member cards with expiry chips; expiring-soon banner; tap member for docs + quick-copy.
2. **Assets tab** — Vehicle bundles (RC/PUC/insurance), property, **purchases** (invoice, amount, store contact, warranty).
3. **Share → Extract → Verify → Store** — Share PDF/image → assign to member or asset → AI on/off → verify if AI → save.
4. **Sign up** — Google OAuth → Terms + Privacy → security onboarding → install + share tutorial → optional recovery code.
5. **Profile → Settings** — Appearance (dark mode), reminders (push + email), Security Center, privacy.
6. **Manage access** — Revoke share, disable member, temp link (1 hr + QR default).
7. **Expiry** — Push + email reminders; snooze; **mark as renewed**.
8. **Biometric lock** — WebAuthn unlock; quick-copy and temp share require unlock.
9. **Visiting Card** (Pro, Phase 6) — digital business/doctor card; **Show nearby** via QR; scan to save contact; NFC tag write on Android only.

---

## Supported document types (MVP → v1)

| Category | Examples | Key extracted fields |
|----------|----------|----------------------|
| Identity | Aadhaar, PAN, Passport, Voter ID | Name, number, DOB, expiry |
| Vehicle | RC, PUC, Driving License, Insurance | Reg no, expiry, insurer, policy no |
| Insurance | Health, Life, Term, Vehicle | Provider, policy no, premium due, expiry |
| Education | Degree, Mark sheets, Certificates | Institution, year, roll no |
| Purchase | Invoice, warranty card, AMC | Product, amount, store, warranty until |
| Other | Rental, Warranty, Work ID | Custom expiry + notes |

Each type has a JSON schema for extraction output. Low-confidence fields are flagged for user review.

---

## Technical stack (planned)

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | React 19 + TypeScript + Vite | Fast dev, PWA plugin |
| PWA | `vite-plugin-pwa` + Workbox | Offline shell, share target SW handler |
| Styling | Tailwind CSS + shadcn/ui | Mobile-first; **light/dark/system**; muted sage palette |
| State | TanStack Query + Zustand | Server state + local UI |
| Backend | Supabase (Auth, Postgres, Storage, RLS) | Row-level security per household |
| Auth | Google OAuth via Supabase | `signInWithOAuth({ provider: 'google' })`; scopes: openid, email, profile |
| AI extraction | On-device OCR (WASM) + optional cloud vision LLM | **On-device first**; cloud opt-in per upload (Pro) |
| Encryption | Web Crypto AES-256-GCM + WebAuthn PRF | Client-side DEK; server stores ciphertext only |
| Push | Web Push + service worker | Reminder delivery |
| Share intake | Web Share Target API | `share_target` in manifest; SW `fetch` POST handler |

---

## Agent working rules

Four principles apply to every change:

| Principle | Rule |
|-----------|------|
| Think before coding | Surface assumptions, ambiguity, tradeoffs |
| Simplicity first | Minimum code; no over-engineering |
| Surgical changes | Touch only what the task requires |
| Goal-driven execution | Verifiable success criteria, test-first |

### Security & compliance (always)

- Treat all uploads as **PII** — never log document content or extracted fields.
- **DPDP Act 2023** + **IT Act §43A / SPDI Rules 2011**: consent at signup, standalone privacy notice, deletion on request, India-region storage, grievance officer, 1-year audit logs.
- **Aadhaar Act / UIDAI**: mask numbers in UI; redact on share; no public display; legal review before launch.
- Do not store raw Aadhaar numbers in analytics or third-party tools.
- AI extraction is **on-device first** (OCR WASM); **cloud opt-in only** (Pro) — user must confirm before persistence.
- **Temp share links** — time-limited, revocable; Aadhaar redacted by default; log all access.
- **Document activity logs** — metadata only; 1-year retention; never log field values or doc content.
- Show **Security Center** — users must see encryption status, data location, lock state.

### PWA constraints

- **Share Target** requires installed PWA; provide in-app upload fallback.
- **iOS**: no Share Target for files yet — use in-app camera/upload; Share Target when Safari supports it.
- **Biometric lock**: WebAuthn with `userVerification: 'required'`; PIN/password fallback.

### File conventions

- `src/` — application code
- `src/schemas/documents/` — per-type extraction schemas
- `src/features/share-target/` — SW share handler
- `src/features/extraction/` — AI pipeline + verify UI
- `src/features/assets/` — vehicle bundles, property, **purchase/warranty**, Assets tab
- `src/features/family/` — member CRUD, invites, contact picker, disable/revoke, Family tab
- `src/features/security/` — Security Center, lock screen, activity logs, recovery code
- `src/features/auth/` — Google OAuth, consent flow
- `src/features/temp-share/` — time-limited links, QR, print view, redaction
- `src/features/visiting-card/` — card editor, public page, QR show/scan, vCard, Web NFC write
- `src/styles/theme.css` — design tokens, dark mode
- `docs/` — ADRs, compliance notes, legal drafts

---

## Phased delivery (high level)

| Phase | Scope |
|-------|-------|
| **0 — Foundation** | PWA shell, theme/dark mode, Family + Assets nav, auth, profile/settings |
| **1 — Intake** | Share target, Assets tab, vehicle bundle, duplicate detection, notes |
| **2 — AI + Verify** | Optional extraction, quick-copy, 3 doc types first |
| **3 — Reminders** | Expiring banner, push + email, mark as renewed |
| **4 — Family + Lock** | Family tab polish, sharing, temp links, recovery code, biometric lock |
| **5 — Polish** | Legal, beta, PAN/Aadhaar schemas, Hindi, DigiLocker (future) |
| **6 — Visiting Card** | QR nearby share, vCard, doctor/business templates, Android NFC write |

Details and market research: [PLAN.md](./PLAN.md).

---

## Potential Ideas (backlog)

Items mentioned for later — tracked in PLAN.md § Potential Ideas until implemented or removed.

---

## Session handoff

**Always update [TRACK.md](./TRACK.md)** after meaningful work so the next agent knows status, blockers, and next steps. Keep it concise.

Any feature deferred by the user → add to PLAN.md § Potential Ideas.

---

## Agentic development loop

See [docs/AGENTIC_LOOP.md](./docs/AGENTIC_LOOP.md) — Manager, Developer, Tester agents in `.cursor/agents/`.
