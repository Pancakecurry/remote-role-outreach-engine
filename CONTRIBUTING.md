# Contributing

Thanks for helping improve Remote Role Outreach Engine.

## Before opening a pull request

1. Create a focused branch.
2. Keep outreach and auto-submission disabled in examples and tests.
3. Use synthetic `.example` addresses, companies, IDs, and candidate facts.
4. Do not commit `.env.local`, résumés, generated application packages, local databases, n8n credential exports, job-application data, or contact evidence.
5. Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run verify:n8n-workflows`, and `npm run verify:unified-n8n`.

Pull requests should explain the behavior and safety impact, include a focused regression test, and document any migration or operator action. Never weaken CAPTCHA, authentication, suppression, rate-limit, audit, or explicit-send controls.

Security issues should follow [SECURITY.md](SECURITY.md), not a public issue.
