-- Mirra initial schema.
-- Every table is owned by a user and protected by row-level security:
-- people can only ever read or change their own rows.

-- ───────────────────────── profiles ─────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text,
  avatar_url    text,
  height_cm     int check (height_cm between 90 and 250),
  build         text,
  fit_prefs     jsonb not null default '{}'::jsonb,   -- { tops: "oversized", bottoms: "slim", ... }
  style_dna     jsonb not null default '{}'::jsonb,   -- quiz result
  palette       jsonb not null default '{}'::jsonb,   -- undertone, season, swatches
  avatar_config jsonb not null default '{}'::jsonb,   -- 2D avatar settings
  tryon_photo_path text,                               -- storage path of full-body photo
  favorite_colors text[] not null default '{}',
  banned_colors   text[] not null default '{}',
  budget        text,
  roast_mode    boolean not null default false,
  onboarded     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ───────────────────────── items (closet) ─────────────────────────
create table if not exists public.items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  image_path   text,                 -- original upload (storage path)
  cutout_path  text,                 -- background-removed version
  category     text not null default 'top',   -- top, bottom, outerwear, shoes, accessory, dress, other
  subcategory  text,
  colors       text[] not null default '{}',  -- hex codes, main first
  pattern      text,
  material     text,
  formality    smallint check (formality between 1 and 5),
  seasons      text[] not null default '{}',
  tags         text[] not null default '{}',
  brand        text,
  price        numeric(10, 2),
  source_url   text,
  status       text not null default 'clean' check (status in ('clean', 'dirty', 'dry_cleaning')),
  times_worn   int not null default 0,
  last_worn    date,
  created_at   timestamptz not null default now()
);
create index if not exists items_user_idx on public.items (user_id, created_at desc);

-- ───────────────────────── lookbooks & outfits ─────────────────────────
create table if not exists public.lookbooks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.outfits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  name            text not null default 'Untitled outfit',
  item_ids        uuid[] not null default '{}',
  layout          jsonb not null default '{}'::jsonb,   -- avatar layer positions
  occasion        text,
  tryon_image_path text,
  lookbook_id     uuid references public.lookbooks (id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists outfits_user_idx on public.outfits (user_id, created_at desc);

-- ───────────────────────── fit checks ─────────────────────────
create table if not exists public.fit_checks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  photo_path  text not null,
  total_score smallint check (total_score between 0 and 100),
  breakdown   jsonb not null default '{}'::jsonb,
  tips        jsonb not null default '[]'::jsonb,
  mode        text not null default 'honest' check (mode in ('honest', 'hype', 'roast')),
  occasion    text,
  created_at  timestamptz not null default now()
);
create index if not exists fit_checks_user_idx on public.fit_checks (user_id, created_at desc);

-- ───────────────────────── wear log & planner ─────────────────────────
create table if not exists public.wear_log (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users (id) on delete cascade,
  outfit_id uuid references public.outfits (id) on delete set null,
  item_ids  uuid[] not null default '{}',
  worn_on   date not null default current_date
);

create table if not exists public.planner_entries (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users (id) on delete cascade,
  day       date not null,
  outfit_id uuid references public.outfits (id) on delete cascade,
  note      text,
  unique (user_id, day)
);

-- ───────────────────────── wishlist ─────────────────────────
create table if not exists public.wishlist (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  url              text,
  name             text,
  image_url        text,
  price            numeric(10, 2),
  match_score      smallint,
  outfits_unlocked int,
  created_at       timestamptz not null default now()
);

-- ───────────────────────── stylist chat ─────────────────────────
create table if not exists public.chat_messages (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  role             text not null check (role in ('user', 'assistant')),
  content          text not null,
  attached_outfits jsonb not null default '[]'::jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists chat_user_idx on public.chat_messages (user_id, created_at);

-- ───────────────────────── row-level security ─────────────────────────
alter table public.profiles        enable row level security;
alter table public.items           enable row level security;
alter table public.lookbooks       enable row level security;
alter table public.outfits         enable row level security;
alter table public.fit_checks      enable row level security;
alter table public.wear_log        enable row level security;
alter table public.planner_entries enable row level security;
alter table public.wishlist        enable row level security;
alter table public.chat_messages   enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

do $$
declare t text;
begin
  foreach t in array array['items','lookbooks','outfits','fit_checks','wear_log','planner_entries','wishlist','chat_messages']
  loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t
    );
  end loop;
end $$;

-- ───────────────────────── auto-create profile on signup ─────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ───────────────────────── private photo storage ─────────────────────────
-- Files live under "<user id>/..." and only that user can touch them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('closet',     'closet',     false, 10485760, array['image/jpeg','image/png','image/webp','image/heic']),
  ('fit-checks', 'fit-checks', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic']),
  ('avatars',    'avatars',    false, 10485760, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

drop policy if exists "mirra own files" on storage.objects;
create policy "mirra own files" on storage.objects
  for all to authenticated
  using (
    bucket_id in ('closet', 'fit-checks', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('closet', 'fit-checks', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
