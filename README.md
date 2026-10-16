# Remote Role Outreach Engine

A self-hosted job-acquisition operating system that turns public ATS listings into a ranked, reviewable application queue.

It discovers roles from Greenhouse, Lever, and Ashby; normalizes and deduplicates them; scores fit without discarding low or unknown compensation; selects an approved résumé; prepares application material; and tracks every state change in Supabase. n8n provides scheduled orchestration while consequential actions remain behind explicit safety switches.

> **Default posture:** discovery and packaging are safe to automate. Outreach and application submission are disabled until the owner deliberately configures and verifies them.

## What it does

- Fetches paginated public ATS listings and records source health, `last_seen`, retries, and closures.
- Ranks by technical fit, role family, location flexibility, compensation, recency, experience, company quality, competition, friction, employment potential, and mission usefulness.
- Keeps below-target and unknown-salary roles in the CRM; compensation changes priority, not eligibility.
- Selects up to three owner-approved one-page résumé PDFs without committing those files to Git.
- Builds cover letters, screening-answer drafts, why-fit notes, compensation guidance, and a manual Apply Now queue.
- Preserves idempotency, audit events, bounded retries, suppression rules, and dry-run controls.
- Supports evidence-backed professional outreach, conservative limits, Day-3/Day-6 follow-ups, and terminal stop conditions.

## Architecture

```text
Greenhouse / Lever / Ashby
            │
            ▼
  ingestion + normalization
            │
            ▼
 Supabase CRM ──► scoring ──► application packages ──► Apply Now
      ▲
      │
     n8n ──► guarded Gmail workflows (disabled by default)
```

| Layer | Technology |
| --- | --- |
| Application | Next.js 16, React 19, TypeScript |
| Source of truth | Supabase Postgres, Auth, RLS |
| Orchestration | n8n |
| Assessment | Gemini structured output |
| Job sources | Greenhouse, Lever, Ashby public endpoints |
| Local runtime | Docker Compose |

See [Architecture](docs/ARCHITECTURE.md), [data model](docs/DATA_MODEL.md), and [contact policy](docs/CONTACT_DISCOVERY_POLICY.md).

## Quick start

Requirements: Node.js 22+, Docker Desktop, a Supabase project, and optionally Gemini and Gmail credentials.

```bash
git clone https://github.com/Pancakecurry/remote-role-outreach-engine.git
cd remote-role-outreach-engine
npm ci
cp .env.example .env.local
```

1. Fill the required Supabase values in `.env.local`.
2. Apply the SQL migrations in `supabase/migrations/` in numeric order.
3. Copy the two example profile files into `config/private/`, remove the `.example` suffix, and replace every sample value with verified facts.
4. Put up to three résumé PDFs in an ignored local directory and point `config/resumes.json` at them.
5. Keep `OUTREACH_ENABLED=false` and `AUTO_SUBMIT_ENABLED=false` while validating the installation.

Then start the local stack:

```bash
./scripts/start-job-engine.sh
```

- Dashboard: <http://localhost:3000/dashboard>
- Apply Now: <http://localhost:3000/apply-now>
- n8n: <http://localhost:5678>

Stop everything with `./scripts/stop-job-engine.sh`. Local schedules run only while the host is awake.

Detailed setup: [docs/MANUAL_SETUP.md](docs/MANUAL_SETUP.md). Operations: [docs/OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md).

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run verify:n8n-workflows
npm run verify:unified-n8n
```

Integration checks that need configured services report sanitized status only.

## Privacy and safety

- `.env.local`, private profiles, résumé PDFs, generated packages, runtime databases, and local activation notes are ignored.
- The tracked profile files contain sample data only.
- n8n workflow JSON contains no credential values or local credential IDs.
- Browser code never receives the Supabase secret key.
- Public job descriptions are treated as untrusted input.
- The engine does not bypass CAPTCHAs, authentication, robots controls, or application-platform safeguards.
- A job is never marked submitted without confirmation.
- Outreach stops on reply, bounce, rejection, opt-out, suppression, manual pause, or role closure.

Read [SECURITY.md](SECURITY.md) before deploying or reporting a vulnerability.

## Project status

The local-first discovery, ranking, CRM, package-generation, and n8n orchestration paths are implemented. Application submission remains manual-only. Gmail delivery is intentionally opt-in and should remain disabled until isolated send, idempotency, reply, bounce, and thread handling are verified in the operator's own environment.

## Contributing

Small, safety-preserving fixes are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). Please do not include real candidate data, résumé files, contact lists, job applications, emails, API responses, or credentials in issues or pull requests.

## License

No open-source license has been selected yet. The source is publicly visible, but reuse rights are not granted automatically. A license can be added by the repository owner later.
