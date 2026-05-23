create extension if not exists pgcrypto;

create table if not exists public.rb_visitors (
  visitor_id text primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  user_agent text
);

create table if not exists public.rb_events (
  id bigserial primary key,
  visitor_id text not null,
  session_id text not null,
  event_type text not null,
  path text,
  referrer text,
  template text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.rb_shared_resumes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  visitor_id text,
  template text not null default 'minimal',
  resume_data jsonb not null,
  views integer not null default 0,
  created_at timestamptz not null default now(),
  last_viewed_at timestamptz
);

create index if not exists rb_events_created_at_idx on public.rb_events (created_at desc);
create index if not exists rb_events_event_type_idx on public.rb_events (event_type);
create index if not exists rb_events_visitor_id_idx on public.rb_events (visitor_id);
create index if not exists rb_shared_resumes_created_at_idx on public.rb_shared_resumes (created_at desc);
create index if not exists rb_shared_resumes_slug_idx on public.rb_shared_resumes (slug);

alter table public.rb_visitors enable row level security;
alter table public.rb_events enable row level security;
alter table public.rb_shared_resumes enable row level security;

-- Public recipients do not need Supabase login because the app reads through
-- /api/share with the server-only service role. These policies are deliberately
-- closed; keep direct anonymous table access disabled unless you intentionally
-- move share reads into the browser.

drop view if exists public.rb_daily_stats;
create view public.rb_daily_stats as
select
  date_trunc('day', created_at)::date as day,
  count(*) filter (where event_type = 'page_view') as page_views,
  count(distinct visitor_id) as unique_visitors,
  count(*) filter (where event_type = 'share_created') as shares_created,
  count(*) filter (where event_type = 'shared_open') as shared_opens,
  count(*) filter (where event_type = 'export_pdf') as pdf_exports,
  count(*) filter (where event_type = 'export_docx') as docx_exports
from public.rb_events
group by 1
order by 1 desc;

drop view if exists public.rb_event_summary;
create view public.rb_event_summary as
select
  event_type,
  count(*) as total_events,
  count(distinct visitor_id) as unique_visitors,
  max(created_at) as last_seen_at
from public.rb_events
group by event_type
order by total_events desc;

drop view if exists public.rb_template_summary;
create view public.rb_template_summary as
select
  coalesce(template, 'unknown') as template,
  count(*) as total_events,
  count(*) filter (where event_type = 'export_pdf') as pdf_exports,
  count(*) filter (where event_type = 'export_docx') as docx_exports,
  count(*) filter (where event_type = 'share_created') as shares_created
from public.rb_events
group by coalesce(template, 'unknown')
order by total_events desc;
