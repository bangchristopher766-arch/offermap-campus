create type public.application_stage as enum (
  'interested',
  'preparing',
  'applied',
  'written_test',
  'interview_1',
  'interview_2',
  'final_interview',
  'offer_discussion',
  'hired',
  'rejected',
  'withdrawn'
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  current_stage public.application_stage not null default 'interested',
  applied_at timestamptz,
  next_event_at timestamptz,
  next_event_type text not null default '',
  channel text not null default '',
  contact text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (position_id)
);

create table public.application_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.applications(id) on delete cascade,
  from_stage public.application_stage,
  to_stage public.application_stage not null,
  occurred_at timestamptz not null default now(),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index idx_applications_user_stage on public.applications(user_id, current_stage);
create index idx_applications_next_event on public.applications(user_id, next_event_at) where next_event_at is not null;
create index idx_application_events_application on public.application_events(application_id, occurred_at desc);

alter table public.applications enable row level security;
alter table public.application_events enable row level security;

create policy "users_manage_own_applications" on public.applications
  for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.positions
      where positions.id = applications.position_id
        and positions.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.positions
      where positions.id = applications.position_id
        and positions.user_id = auth.uid()
    )
  );

create policy "users_manage_own_application_events" on public.application_events
  for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.applications
      where applications.id = application_events.application_id
        and applications.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.applications
      where applications.id = application_events.application_id
        and applications.user_id = auth.uid()
    )
  );
