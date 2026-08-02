# Security controls

Secrets stay in ignored local environment files; only placeholders are committed. RLS permits authenticated owners only, while server automation uses the secret key and explicit `APP_OWNER_USER_ID`. Future fetching must enforce allowlists, URL parsing, redirects limits, size limits, and SSRF protections. Job pages and prompts are untrusted and must never override system policy.

LinkedIn scraping, guessed-email sending, SMTP probing, paid data brokers, and public anonymous access are prohibited. Suppression, dry-run kill switch, rate limits, deduplication/idempotency, and integration audit events are first-class controls. Auto-send stays disabled until a later controlled activation.
