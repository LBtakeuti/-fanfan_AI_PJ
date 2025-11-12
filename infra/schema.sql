-- URLマスター：登録サイト
create table if not exists public.url_sources (
  id uuid primary key default gen_random_uuid(),
  artist_hint text,
  source_url text not null unique,
  tags text[],
  last_crawled_at timestamptz,
  last_status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 抽出結果（確定イベント、1行=1公演）
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  tour text,
  tour_start_date date,
  tour_end_date date,
  place text,               -- サイト表記そのまま
  place_start_date date,
  place_end_date date,
  date date not null,
  performance time,
  artist text,
  source_url text not null,
  checksum text not null,   -- 重複/変更検知用キー
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (artist, tour, place, date, performance)
);

-- 抽出ジョブ履歴（監査・障害解析）
create table if not exists public.extractions (
  id uuid primary key default gen_random_uuid(),
  source_url text not null,
  status text not null,       -- queued | running | success | failed
  reason text,
  stats jsonb,
  started_at timestamptz default now(),
  finished_at timestamptz
);

-- 変更履歴（差分監査）
create table if not exists public.event_changes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  change jsonb not null,
  changed_at timestamptz default now()
);

-- プロファイル/権限（管理者のみ書込）
create table if not exists public.user_profiles (
  user_id uuid primary key,
  role text not null default 'viewer' -- admin | editor | viewer
);

-- RLS
alter table public.url_sources enable row level security;
alter table public.events enable row level security;
alter table public.extractions enable row level security;
alter table public.event_changes enable row level security;
alter table public.user_profiles enable row level security;

-- 管理者のみ書込ポリシー（簡易）
create policy "url_sources_read" on public.url_sources for select using (true);
create policy "url_sources_write_admin" on public.url_sources for insert with check (
  exists (select 1 from public.user_profiles p where p.user_id = auth.uid() and p.role in ('admin','editor'))
);
create policy "url_sources_update_admin" on public.url_sources for update using (
  exists (select 1 from public.user_profiles p where p.user_id = auth.uid() and p.role in ('admin','editor'))
);
create policy "url_sources_delete_admin" on public.url_sources for delete using (
  exists (select 1 from public.user_profiles p where p.user_id = auth.uid() and p.role in ('admin','editor'))
);

create policy "events_read" on public.events for select using (true);
create policy "events_write_admin" on public.events for insert with check (
  exists (select 1 from public.user_profiles p where p.user_id = auth.uid() and p.role in ('admin','editor'))
);
create policy "events_update_admin" on public.events for update using (
  exists (select 1 from public.user_profiles p where p.user_id = auth.uid() and p.role in ('admin','editor'))
);

create policy "extractions_read" on public.extractions for select using (true);
create policy "extractions_write_admin" on public.extractions for insert with check (
  exists (select 1 from public.user_profiles p where p.user_id = auth.uid() and p.role in ('admin'))
);

create policy "event_changes_read" on public.event_changes for select using (true);
create policy "event_changes_write_admin" on public.event_changes for insert with check (
  exists (select 1 from public.user_profiles p where p.user_id = auth.uid() and p.role in ('admin','editor'))
);