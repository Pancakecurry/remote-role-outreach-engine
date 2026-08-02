# Supabase

Apply `migrations/001_initial_schema.sql` manually in Phase 2 after creating a Supabase project. n8n server-side actions must write `owner_id` from `APP_OWNER_USER_ID`; browser clients operate only through authenticated RLS policies. The migration deliberately has no anonymous policy and is not applied by this repository.
