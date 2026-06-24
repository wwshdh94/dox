# PreVault — Welcome & Guest Explore Flow

**Route:** `/welcome`  
**As of:** 2026-06-23

---

## User journey

```mermaid
flowchart TD
  A[First visit] --> B[/welcome — 5 slides]
  B -->|Skip to sign in| C[/login]
  B -->|Explore first| D[Guest preview + demo data]
  B -->|Continue with Google| C
  C -->|Google + consent| E[/onboarding]
  C -->|Explore without signing in| D
  D -->|Banner: Sign in| C
  E --> F[App home]
  D --> F
```

---

## Screens (5 slides)

| # | ID | Content |
|---|-----|---------|
| 1 | `hero` | Animated **cloud vault** graphic — encrypted cloud positioning |
| 2 | `upload` | Share → OCR → verify mock |
| 3 | `family` | Household members + sharing mock |
| 4 | `expiry` | Due-soon reminders mock |
| 5 | `security` | AES-256, TLS, India region, zero-knowledge |

**Final slide CTAs:** Continue with Google · Explore the app first  
**Header:** Skip to sign in (any slide)

---

## Auth rules

| Rule | Implementation |
|------|----------------|
| Google only | Login shows single Google button; no email/password |
| Consent required | ToS + Privacy radio before Google |
| Explore without auth | `enterGuestExplore()` — seeded demo vault, `isGuestPreview` user |
| Save requires sign-in | Guest banner + write actions should prompt login (future gate) |

---

## Files

| File | Role |
|------|------|
| `src/features/welcome/WelcomeFlowPage.tsx` | Carousel + CTAs |
| `src/features/welcome/CloudVaultHero.tsx` | SVG motion graphic |
| `src/features/welcome/WelcomeStepVisual.tsx` | Demo mock UIs |
| `src/lib/guestExplore.ts` | Routing helpers |
| `src/components/GuestSignInBanner.tsx` | Preview mode strip |
| `src/components/AppLayout.tsx` | `/welcome` gate for new users |

---

## Store flags

- `settings.welcomeSeen` — tour completed or skipped
- `settings.guestExplore` — preview mode active
- `user.isGuestPreview` — temporary guest user; cleared on Google sign-in

---

## Production (Supabase)

Replace `signInDemo()` with `supabase.auth.signInWithOAuth({ provider: 'google' })`. Keep the same welcome → login → onboarding order.
