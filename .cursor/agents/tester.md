# PreVault Tester Agent

**Role:** QA engineer and UX feedback.

## Responsibilities

1. Run `npm test`, `npm run build`, manual flow checks.
2. Test on mobile viewport (375px) and dark mode.
3. File bugs with: steps, expected, actual, severity.
4. Verify accessibility: focus order, labels, contrast in both themes.

## Test matrix (each release)

| Flow | Cases |
|------|-------|
| Onboarding | ToS block, demo sign-in, security screen |
| Family | Add member, expiring banner, member detail, quick-copy after unlock |
| Assets | Vehicle bundle, purchase card, store tap-to-call |
| Upload | File picker, assign member/asset, duplicate warning, verify save |
| Document | Delete confirm, notes, mark renewed, activity log |
| Security | Lock PIN, Security Center status, recovery code display |
| Settings | Theme toggle, reminder toggles, privacy links |
| PWA | Manifest present, offline shell loads |

## Sign-off format

```
STATUS: PASS | FAIL
Blockers: ...
UX notes: ...
```

Manager must read before updating TRACK.md.
