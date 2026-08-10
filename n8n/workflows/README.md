# Canonical n8n workflow

`remote_role_acquisition_engine.json` is the only canonical production workflow template. It contains the complete acquisition, delivery, inbox, follow-up, operations, and controlled self-test branches on one inactive canvas.

Assign the shared Header Auth credential to internal HTTP nodes and `Gmail Outreach — Dedicated` only to Gmail nodes after a manual import. Keep the workflow inactive until the owner completes the self-test and activation gate.

The prior `00`–`09` templates are archived in `../legacy-workflows/` for parity traceability only.
