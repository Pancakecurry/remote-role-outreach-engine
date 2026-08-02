# Gmail sequence design

Phase 1 does not connect to Gmail, create drafts, or send messages. Future records retain Gmail message ID, thread ID, RFC `In-Reply-To`, and `References` for each sequence.

Lifecycle: `DISCOVERED → CONTACT_FOUND → DRAFT_READY → READY_TO_SEND → INITIAL_SENT → FOLLOWUP_ONE_DUE → FOLLOWUP_ONE_SENT → FOLLOWUP_TWO_DUE → FOLLOWUP_TWO_SENT → CLOSED`. Day 3 and Day 6 follow-ups are idempotent and must recheck evidence, eligibility, suppression, reply, bounce, opt-out, pause, and closure immediately before send. Reply, bounce, opt-out, pause, or closure cancel the sequence; automatic responses are classified separately and never silently override a stop condition.
