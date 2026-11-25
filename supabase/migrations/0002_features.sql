-- Columns and helpers used by phases 3–14 and the extra features.

alter table public.items
  add column if not exists favorite     boolean not null default false,
  add column if not exists notes        text,
  add column if not exists purchased_on date,
  add column if not exists archived     boolean not null default false,
  add column if not exists wear_goal    int;

alter table public.outfits
  add column if not exists favorite boolean not null default false;

alter table public.profiles
  add column if not exists location    jsonb,
  add column if not exists units       text not null default 'imperial' check (units in ('metric', 'imperial')),
  add column if not exists hide_scores boolean not null default false,
  add column if not exists theme       text not null default 'dark' check (theme in ('dark', 'light', 'system'));

alter table public.fit_checks
  add column if not exists headline text,
  add column if not exists verdict  text;

alter table public.wishlist
  add column if not exists verdict  text,
  add column if not exists analysis jsonb;

create table if not exists public.packing_lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  destination text not null,
  start_date  date,
  end_date    date,
  plan        jsonb not null default '{}'::jsonb,
  checked     text[] not null default '{}',
  created_at  timestamptz not null default now()
);
alter table public.packing_lists enable row level security;
drop policy if exists "own rows" on public.packing_lists;
create policy "own rows" on public.packing_lists
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists wear_log_user_idx on public.wear_log (user_id, worn_on desc);

-- Log a wear: records it and bumps every item's counters atomically.
create or replace function public.log_wear(p_item_ids uuid[], p_outfit_id uuid default null, p_day date default current_date)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.wear_log (user_id, outfit_id, item_ids, worn_on)
  values (auth.uid(), p_outfit_id, p_item_ids, p_day)
  returning id into new_id;

  update public.items
     set times_worn = times_worn + 1,
         last_worn  = greatest(coalesce(last_worn, p_day), p_day),
         status     = case when category in ('top', 'bottom', 'dress') then 'dirty' else status end
   where id = any (p_item_ids)
     and user_id = auth.uid();

  return new_id;
end;
$$;

-- Undo a wear log entry.
create or replace function public.unlog_wear(p_log_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ids uuid[];
begin
  delete from public.wear_log
   where id = p_log_id and user_id = auth.uid()
  returning item_ids into ids;

  if ids is not null then
    update public.items
       set times_worn = greatest(times_worn - 1, 0),
           last_worn  = (select max(w.worn_on) from public.wear_log w
                          where w.user_id = auth.uid() and items.id = any (w.item_ids))
     where id = any (ids) and user_id = auth.uid();
  end if;
end;
$$;
