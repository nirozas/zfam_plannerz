-- Health Trackers Table
create table if not exists public.health_trackers (
  id           text primary key,
  user_id      uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  emoji        text not null default '??',
  type         text not null check (type in ('qualitative', 'quantitative')),
  display_mode text check (display_mode in ('year_in_pixels', 'contribution_graph')),
  values       text,       -- JSON string of QualitativeValue[]
  unit         text,
  chart_type   text check (chart_type in ('area', 'bar', 'line')),
  goal_value   numeric,
  reference_min numeric,
  reference_max numeric,
  color        text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

-- Health Entries Table
create table if not exists public.health_entries (
  id                    text primary key,
  tracker_id            text not null references public.health_trackers(id) on delete cascade,
  user_id               uuid references auth.users(id) on delete cascade not null,
  date                  date not null,
  date_end              date,
  qualitative_value_id  text,
  numeric_value         numeric,
  note                  text,
  created_at            timestamptz not null default now(),
  unique (tracker_id, date)   -- one entry per tracker per day
);

-- Enable RLS
alter table public.health_trackers enable row level security;
alter table public.health_entries enable row level security;

-- RLS policies
create policy "Users manage own trackers"
  on public.health_trackers for all
  using (auth.uid() = user_id);

create policy "Users manage own entries"
  on public.health_entries for all
  using (auth.uid() = user_id);

-- Indexes
create index if not exists idx_health_trackers_user on public.health_trackers(user_id);
create index if not exists idx_health_entries_tracker on public.health_entries(tracker_id);
create index if not exists idx_health_entries_date on public.health_entries(user_id, date desc);
