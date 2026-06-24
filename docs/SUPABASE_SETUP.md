# PreVault — Supabase setup (P0 auth)

**Phase:** P0 — Google OAuth + session + `profiles`  
**Next:** P1 households, P2 documents ACL, P3 encrypted Storage

---

## 1. Create projects (3 environments)

| Env | Name | Region |
|-----|------|--------|
| Dev | `prevault-dev` | Mumbai |
| UAT | `prevault-uat` | Mumbai |
| Prod | `prevault-prod` | Mumbai (required) |

Copy **Project URL** and **anon public key** into `.env`:

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_DEMO_AUTH=false   # Prod/UAT — demo sign-in disabled
```

Local dev without Supabase: leave vars empty — `VITE_DEMO_AUTH` defaults on in `npm run dev`.

---

## 2. Google OAuth (Supabase Auth)

1. Supabase → **Authentication → Providers → Google** → Enable  
2. Use [Google Cloud Console](https://console.cloud.google.com/apis/credentials) OAuth client  
3. **Authorized redirect URIs** (per project):

   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

4. Supabase → **Authentication → URL configuration**:

   | Field | Dev example |
   |-------|-------------|
   | Site URL | `http://localhost:5173` |
   | Redirect URLs | `http://localhost:5173/auth/callback` |

   Add UAT/Prod URLs when deployed.

---

## 3. Run migration

In Supabase **SQL Editor**, run:

[`server/supabase/migrations/001_p0_profiles.sql`](../server/supabase/migrations/001_p0_profiles.sql)

Then run:

[`server/supabase/migrations/002_p1_households.sql`](../server/supabase/migrations/002_p1_households.sql)

Then run (fixes invite bootstrap + RLS):

[`server/supabase/migrations/003_p1_households_rls_fix.sql`](../server/supabase/migrations/003_p1_households_rls_fix.sql)

Then run (documents metadata + share grants + RLS):

[`server/supabase/migrations/004_p2_documents_acl.sql`](../server/supabase/migrations/004_p2_documents_acl.sql)

Then run (encrypted Storage bucket + policies):

[`server/supabase/migrations/005_p3_storage.sql`](../server/supabase/migrations/005_p3_storage.sql)

Set `VITE_VAULT_PEPPER` in `.env` (unique per environment) for household file encryption.

Then run (launch cohort + document caps):

[`server/supabase/migrations/006_p4_launch_cohort_and_limits.sql`](../server/supabase/migrations/006_p4_launch_cohort_and_limits.sql)

Then run (owner delete vault / transfer ownership / delete account):

[`server/supabase/migrations/007_p5_account_lifecycle.sql`](../server/supabase/migrations/007_p5_account_lifecycle.sql)

---

## 4. App flow (implemented)

| Step | Route / file |
|------|----------------|
| Welcome / guest | `/welcome`, guest explore |
| Sign in | `/login` → `signInWithGoogle()` |
| OAuth callback | `/auth/callback` → `AuthCallbackPage` |
| Session restore | `AuthProvider` on boot |
| Profile row | `ensureProfileForAuthUser()` |

---

## 5. Verify locally

```bash
cd /Users/shdh94/projects/Dox
cp .env.example .env   # fill Supabase vars
npm run dev
```

1. Open `/login` → **Continue with Google**  
2. Complete Google consent → lands on `/onboarding`  
3. Refresh — session persists  
4. Profile → **Sign out** → session cleared  

---

## Roadmap (after P0)

| Phase | Deliverable |
|-------|-------------|
| **P1** | `households`, `household_members`, invite join |
| **P2** | `documents` metadata + `share_grants` + RLS |
| **P3** | Encrypted Storage upload; drop `fileDataUrl` persist |
| **P4** | UAT/Prod deploy; `VITE_DEMO_AUTH=false` |

See [PRODUCTION_MVP_GAP_ANALYSIS.md](./PRODUCTION_MVP_GAP_ANALYSIS.md) and [architect.md](../.cursor/agents/architect.md).
