-- Extras: monthly budget, self-serve account deletion.

alter table public.profiles
  add column if not exists monthly_budget numeric(10, 2) check (monthly_budget is null or monthly_budget >= 0);

-- Deletes the calling user's auth account; every table cascades from auth.users.
-- Photos are removed from storage by the app before this is called.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
