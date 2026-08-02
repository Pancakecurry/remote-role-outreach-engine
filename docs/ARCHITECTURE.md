# Architecture

Next.js provides a private CRM. The browser client uses only public Supabase configuration. The SSR client uses the publishable key plus Supabase Auth cookies, validates the user with `auth.getUser()`, and lets RLS decide all normal CRM reads/writes. The server-only admin client holds the secret key exclusively for named scripts and future trusted n8n automation; it is not used by CRM pages.

Next 16 `proxy.ts` refreshes Supabase cookies on requests. Protected server routes validate the user again before rendering, so a cookie alone is never trusted. Every CRM row has an owner; future n8n inserts use `APP_OWNER_USER_ID` with the trusted server key.

n8n, Gemini, controlled public extraction, and Gmail remain future components. All fetched content will be untrusted input. Apollo was removed because the architecture uses public evidence rather than paid contact data.

Phase 2B-2 adds read-only owner/profile verification and guarded synthetic seed tooling. Browser reads continue through the authenticated SSR client and RLS; the admin client is limited to named verification and demo scripts. Future n8n automation will propagate `APP_OWNER_USER_ID`, never a browser-supplied owner value.

Phase 3 adds a server-only ingestion orchestrator. It reads enabled owner-scoped public ATS sources, calls only fixed provider origins, records source runs and workflow state, and writes canonical jobs through the admin boundary. The CRM continues to read with the authenticated SSR client and RLS. The future n8n template invokes a narrow internal route but remains inactive.
