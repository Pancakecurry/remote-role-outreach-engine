# Local setup

## 1. Install dependencies

Requirements: Node.js 22+, Docker Desktop, and a Supabase project.

```bash
npm ci
cp .env.example .env.local
```

Set the Supabase URL, publishable key, secret key, a strong internal automation token, and an owner UUID in the ignored `.env.local`. Add Gemini configuration only when enabling model assessment.

## 2. Create private local configuration

Copy these templates without the `.example` suffix:

- `config/candidate-profile.example.json` → `config/private/candidate-profile.json`
- `config/mission-priorities.example.json` → `config/private/mission-priorities.json`

Replace every sample with verified owner data. Both destination files are ignored and mounted read-only into the app container. Put up to three one-page résumé PDFs in an ignored directory and update `config/resumes.json` with their local paths. Never commit real profiles or résumés.

## 3. Prepare Supabase

Apply `supabase/migrations/*.sql` in numeric order to a fresh project. Create one owner through Supabase Authentication, keep public sign-up disabled, and place that user's UUID in `APP_OWNER_USER_ID`.

Run:

```bash
npm run preflight:supabase
npm run verify:supabase
npm run verify:owner
```

## 4. Start and verify

```bash
./scripts/start-job-engine.sh
npm run stack:verify
npm run verify:production-readiness
```

The dashboard is at <http://localhost:3000/dashboard>, Apply Now at <http://localhost:3000/apply-now>, and n8n at <http://localhost:5678>.

## 5. Configure n8n safely

Import `n8n/workflows/remote_role_acquisition_engine.json`. In n8n, create a Header Auth credential whose header name is `x-internal-automation-token` and whose value matches the local token. Assign Gmail OAuth only through n8n's credential UI. If the startup helper should preserve existing n8n records, set the three `ACQUISITION_*_ID` values locally; never add those IDs to source.

Keep `OUTREACH_MODE=dry_run`, `OUTREACH_ENABLED=false`, `AUTO_SUBMIT_ENABLED=false`, and `DAILY_SUMMARY_ENABLED=false` until their isolated tests pass and the operator deliberately enables them.
