-- Milestone 9: the opportunity map report and its exports.

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.sessions (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  -- The opportunity map, assembled in code from the session's data.
  map jsonb,
  -- The plain-English writing (executive summary, notes, learning). Written
  -- by the AI from anonymised data, or by templates if the AI fails.
  prose jsonb,
  prose_source text check (prose_source in ('ai', 'template')),
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger reports_set_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

-- Every exported file. PDF only in phase one; CSV, Jira and UiPath later.
create table public.report_exports (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  format text not null check (format in ('pdf', 'csv', 'jira', 'uipath')),
  storage_path text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index report_exports_report_idx on public.report_exports (report_id, created_at);

alter table public.reports enable row level security;
alter table public.report_exports enable row level security;

create policy "session staff can read reports"
  on public.reports for select to authenticated
  using (public.is_session_staff(session_id));

create policy "session staff can read report exports"
  on public.report_exports for select to authenticated
  using (exists (select 1 from public.reports r where r.id = report_id and public.is_session_staff(r.session_id)));

alter publication supabase_realtime add table public.reports;

-- Exported files live in a private bucket; the server writes them with the
-- service role and hands them to staff directly.
insert into storage.buckets (id, name, public)
values ('reports', 'reports', false)
on conflict (id) do nothing;
