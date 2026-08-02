# Daily job discovery template

This inactive Phase 3 template schedules a POST at 5:00 PM in `Asia/Kolkata`. Set n8n environment variables `INTERNAL_INGESTION_URL` and `INTERNAL_AUTOMATION_TOKEN` before importing. For local Docker, the URL may need `host.docker.internal` rather than `localhost`.

Import the JSON in n8n, configure the environment-backed token, and run one manual execution only after the internal route is configured. Activation is deliberately deferred: Phase 3 keeps all orchestration inactive while source and CRM QA are completed.
