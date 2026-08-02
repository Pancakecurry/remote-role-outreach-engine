# Phase 3 public ATS ingestion

Phase 3 reads only public Greenhouse, Lever, and Ashby job-board GET endpoints through fixed HTTPS origins. Source records carry board identifiers, health, run history, and no arbitrary API origin. Provider payloads are Zod-validated, malformed records are isolated, descriptions become inert plain text, and bounded response/timeout/retry controls apply.

Jobs are unique by owner/source/external provider identity. Repeated observations update lifecycle fields without duplicates. A job is closed only after three successful source runs omit it; a failed source run never advances absence counters, and a reappearing job is reopened. Ingestion creates no contact, assessment, application, Gmail, or outreach records.

The internal route accepts only a narrow POST body, runs only in dry-run outreach mode, and requires a configured automation token in production-like environments. The n8n workflow template is inactive and not imported or started in this phase.
