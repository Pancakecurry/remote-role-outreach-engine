# Phase 2B-2 acceptance matrix

| Check | Evidence | Status gate |
| --- | --- | --- |
| Owner account and profile | `npm run verify:owner` reports only sanitized checks | Required before demo seed |
| RLS anonymous block | `npm run verify:supabase` and preflight report blocked | Required |
| Synthetic dataset | `npm run seed:demo` twice, then `npm run verify:demo` | Required before browser QA |
| Demo safety | All synthetic evidence and sequences remain non-sendable | Required |
| Route protection | `npm run test:smoke` redirects `/dashboard` to `/login` | Required |
| Browser authentication | Owner completes [manual QA](./PHASE_2B2_MANUAL_QA.md) | Required before Phase 3 |

The owner account is manually provisioned. The profile trigger must be verified, and all demo records are synthetic. Authenticated browser verification remains an owner-operated gate. Gmail is disconnected, n8n is not running, live discovery is absent, and no outreach is sent. Phase 3 must not begin until manual QA passes.
