# Phase 2A acceptance matrix

| Check | Evidence | Status |
| --- | --- | --- |
| Migration audited and deployed | Supabase CLI migration history and read-only verification | Complete in Phase 2B-1 |
| Single-owner auth model | No sign-up route; Dashboard user creation documented | Implemented |
| Browser boundary | Browser client has public keys only | Implemented |
| SSR/RLS boundary | Server client uses cookies and `auth.getUser()` | Implemented |
| Admin boundary | Secret-key module is server-only | Implemented |
| Protected routes | CRM routes require authenticated user | Implemented |
| CRM queries | Explicit-column, Zod-validated server repositories | Implemented |
| Safe preflights | Sanitized real integration checks | Implemented |
| Demo tooling | Dry-run/owner guarded, idempotent, removable | Implemented, not executed |
| No production automation | Gmail, discovery, n8n, and sends disabled | Confirmed |

Phase 2B-1 verified that no Auth user or demo/application data exists. Public signup remains disabled; creating the single owner is the next manual gate.
