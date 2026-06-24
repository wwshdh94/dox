# PreVault — Launch Cohort & Lifetime Pro Tasks

**Target:** Month-end MVP (**2026-06-30**)  
**Cohort size:** **First 100 users only**  
**Related:** [architect.md](../.cursor/agents/architect.md) § Locked decisions, [PRODUCTION_MVP_GAP_ANALYSIS.md](./PRODUCTION_MVP_GAP_ANALYSIS.md)

---

## Launch cohort rules

| Rule | Detail |
|------|--------|
| Signup cap | `VITE_LAUNCH_COHORT_MAX_USERS=100` — **user 101+ gets free plan only** (no launch Pro) |
| Pro at launch | `VITE_LAUNCH_COHORT_PRO=true` — **Pro features only for cohort members** |
| Document cap | **50 verified docs per member** — all users |
| Billing | Deferred; Razorpay post-launch |
| Lifetime Pro | **Cohort only** — complete task program before/at launch |

Users **1–100** get Pro during beta and can earn **Lifetime Pro**. User **101+** uses standard free tier until they upgrade when billing launches.

---

## Gamified tasks → Lifetime Pro

### Unlock rule

**Cohort members only.** Complete **6 of 8 tasks** → `lifetimePro = true` (permanent Pro; still subject to 50-doc cap).

| # | Task ID | Requirement |
|---|---------|-------------|
| 1 | `onboarding_complete` | Finish security onboarding |
| 2 | `upload_11_docs` | **Add 11 documents** |
| 3 | `review_11_docs` | **Review 11 documents** |
| 4 | `add_4_family_members` | **Add 4 family members** |
| 5 | `create_backup` | Create encrypted backup (file or Drive) |
| 6 | `approved_feedback` | **2 admin-approved quality feedbacks** (50+ chars each) |
| 7 | `install_pwa` | Install to home screen |
| 8 | `enable_biometric` | Enable biometric lock |

### Feedback task (admin gate)

- User submits feedback from `/profile/feedback` — message must be **≥50 characters** to qualify.
- Admin clicks **Approve quality** in dashboard — sets `adminQualityApproved` on the thread.
- Task completes when **2 distinct threads** are approved for that user.
- Short or low-effort messages cannot be approved (button disabled).

### Client implementation

- `src/lib/launchCohort.ts` — 100-user cap, cohort slot on signup
- `src/lib/launchTasks.ts` — thresholds + progress
- `src/lib/feedback.ts` — `countAdminApprovedQualityFeedback()`
- `/profile/earn-pro` — progress UI (cohort-only)
- `User.launchCohort` + `User.lifetimePro` — `isProUser()` in `planLimits.ts`

### Copy (user-facing)

> **Earn Lifetime Pro** — First 100 members only. Complete 6 tasks including 11 documents, 4 family members, and 2 admin-approved feedbacks. Keep Pro free forever when paid plans launch.

---

## Haptic feedback (PWA)

| Platform | Support |
|----------|---------|
| **Android Chrome / installed PWA** | Yes — Vibration API |
| **iOS Safari / A2HS** | No |
| **Desktop** | No-op |

See `src/lib/haptics.ts` + Appearance settings.

---

## Agent handoff

| Agent | Action |
|-------|--------|
| **Architect** | `profiles.launch_cohort`, `lifetime_pro`, server-side cohort cap |
| **Developer** | Sync task + feedback approval to Supabase |
| **Security Chief** | Admin sees feedback text; no doc content |
| **Tester** | Cohort #101 waitlist; 2 approved feedbacks; 11 docs / 4 members |
| **Manager** | Enforce 100 cap in prod signup flow |
