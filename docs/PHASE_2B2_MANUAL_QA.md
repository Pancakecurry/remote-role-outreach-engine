# Phase 2B-2 manual QA

Do not share the login email or password in a report, screenshot, issue, or chat.

1. Start the application with:
   `npm run dev`
2. Open:
   `http://localhost:3000/dashboard`
3. Verify unauthenticated redirect to:
   `/login`
4. Enter an incorrect password once.
5. Verify:
   - Generic failure message
   - No account-existence disclosure
   - No password visible in URL or logs
6. Log in using the manually created owner email/password.
7. Verify redirect to:
   `/dashboard`
8. Verify:
   - DRY RUN visible
   - Automatic outreach disabled
   - Demo data indicator
   - Synthetic dashboard metrics
9. Open every CRM page:
   - Jobs
   - Contacts
   - Outreach
   - Replies
   - Workflow Runs
   - Settings
10. Verify only synthetic records appear.
11. Verify the unsafe contact is clearly blocked.
12. Verify the missing-contact job remains available for manual application.
13. Verify settings are read-only.
14. Log out.
15. Re-open:
   `/dashboard`
16. Verify redirect back to:
   `/login`
17. Confirm browser cookies no longer provide CRM access after logout.
18. Confirm there is no signup route or link.

No Gmail connection, n8n process, live discovery, or outreach sending is part of this QA.
