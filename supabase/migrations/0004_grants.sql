-- Newer Supabase projects don't auto-grant table access to API roles for tables
-- created via SQL. Signed-in users get table access here; row-level security
-- (already enabled on every table) still limits them to their own rows.
-- The anonymous role gets nothing.

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.log_wear(uuid[], uuid, date) to authenticated;
grant execute on function public.unlog_wear(uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;

revoke all on all tables in schema public from anon;
revoke execute on function public.log_wear(uuid[], uuid, date) from anon, public;
revoke execute on function public.unlog_wear(uuid) from anon, public;

-- Future tables created by migrations get the same treatment.
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
