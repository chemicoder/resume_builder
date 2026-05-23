-- Run this before enabling Supabase anonymous sign-ins.
-- The app writes analytics and shared resumes through Vercel API routes with
-- the service-role key, so browsers do not need direct table access.

do $$
declare
  rel_name text;
  policy_record record;
begin
  foreach rel_name in array array[
    'rb_visitors',
    'rb_events',
    'rb_shared_resumes',
    'shared_resumes'
  ]
  loop
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = rel_name
        and c.relkind in ('r', 'p')
    ) then
      execute format('alter table public.%I enable row level security', rel_name);
      execute format('revoke all on table public.%I from anon, authenticated', rel_name);

      for policy_record in
        select policyname
        from pg_policies
        where schemaname = 'public'
          and tablename = rel_name
      loop
        execute format('drop policy if exists %I on public.%I', policy_record.policyname, rel_name);
      end loop;
    end if;
  end loop;
end $$;

do $$
declare
  rel_name text;
begin
  foreach rel_name in array array[
    'rb_daily_stats',
    'rb_event_summary',
    'rb_template_summary'
  ]
  loop
    if exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = rel_name
        and c.relkind = 'v'
    ) then
      execute format('revoke all on table public.%I from anon, authenticated', rel_name);

      begin
        execute format('alter view public.%I set (security_invoker = true)', rel_name);
      exception
        when others then
          null;
      end;
    end if;
  end loop;
end $$;

do $$
begin
  if to_regclass('public.rb_events_id_seq') is not null then
    revoke all on sequence public.rb_events_id_seq from anon, authenticated;
  end if;
end $$;
