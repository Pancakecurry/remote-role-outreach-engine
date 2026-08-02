# Phase 2A acceptance matrix

| Check | Evidence | Status |
| --- | --- | --- |
| Migration audited but not applied | Reviewed `001_initial_schema.sql` | Ready for manual application |
| Single-owner auth model | No sign-up route; Dashboard user creation documented | Implemented |
| Browser boundary | Browser client has public keys only | Implemented |
| SSR/RLS boundary | Server client uses cookies and `auth.getUser()` | Implemented |
| Admin boundary | Secret-key module is server-only | Implemented |
| Protected routes | CRM routes require authenticated user | Implemented |
| CRM queries | Explicit-column, Zod-validated server repositories | Implemented |
| Safe preflights | Sanitized real integration checks | Implemented |
| Demo tooling | Dry-run/owner guarded, idempotent, removable | Implemented, not executed |
| No production automation | Gmail, discovery, n8n, and sends disabled | Confirmed |
