-- Tables only the server reads and writes. Row security already hides every
-- row from the browser roles (they have no policies); taking the grants away
-- as well means a future policy added by mistake cannot open them.
revoke all on public.admin_log from anon, authenticated;
revoke all on public.ai_profiles from anon, authenticated;
revoke all on public.ai_usage from anon, authenticated;
revoke all on public.task_cards from anon, authenticated;
revoke all on public.telegram_sessions from anon, authenticated;
revoke all on public.tutor_state from anon, authenticated;

-- A profile photo is only ever read through the server route for its owner.
revoke select on public.profile_avatars from anon;
