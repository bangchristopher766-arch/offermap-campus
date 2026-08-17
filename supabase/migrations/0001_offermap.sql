create type public.position_category as enum ('technology', 'product', 'operations', 'marketing');
create type public.evidence_status as enum ('strong', 'partial', 'missing');

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  parsed_text text not null,
  content_hash text not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  resume_id uuid references public.resumes(id) on delete set null,
  category public.position_category not null,
  title text not null,
  department text not null default '',
  location text not null default '',
  job_code text not null default '',
  jd_text text not null,
  analysis_status text not null default 'pending' check (analysis_status in ('pending','processing','ready','stale','failed')),
  analyzed_resume_version integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.requirements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  kind text not null check (kind in ('required','preferred','responsibility')),
  requirement text not null,
  jd_quote text not null,
  importance text not null check (importance in ('high','medium','low')),
  created_at timestamptz not null default now()
);

create table public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  title text not null,
  resume_quote text not null,
  user_note text not null default '',
  created_at timestamptz not null default now()
);

create table public.requirement_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requirement_id uuid not null references public.requirements(id) on delete cascade,
  evidence_id uuid references public.evidence_items(id) on delete cascade,
  status public.evidence_status not null,
  rationale text not null,
  action text not null
);

create table public.resume_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  action text not null check (action in ('keep','rewrite','add','deemphasize')),
  original_text text not null,
  suggested_text text not null,
  reason text not null,
  risk text not null,
  accepted boolean not null default false,
  edited_text text,
  created_at timestamptz not null default now()
);

create table public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  priority text not null check (priority in ('high','medium','low')),
  priority_reason text not null,
  main_question text not null,
  intent text not null,
  answer_structure jsonb not null default '[]',
  missing_information text not null default '',
  risk text not null default '',
  source_requirement_ids jsonb not null default '[]',
  source_evidence_ids jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.question_followups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.interview_questions(id) on delete cascade,
  sort_order integer not null,
  question text not null
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  task text not null,
  model text not null,
  prompt_version text not null,
  input_hash text not null,
  status text not null check (status in ('processing','ready','failed')),
  duration_ms integer,
  input_tokens integer,
  output_tokens integer,
  error_code text,
  created_at timestamptz not null default now()
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  target_type text not null check (target_type in ('evidence','resume_suggestion','interview_question')),
  target_id uuid,
  helpful boolean not null,
  comment text not null default '',
  created_at timestamptz not null default now()
);

create index idx_companies_user on public.companies(user_id);
create index idx_positions_company_category on public.positions(company_id, category);
create index idx_positions_user_status on public.positions(user_id, analysis_status);
create index idx_requirements_position on public.requirements(position_id);
create index idx_evidence_resume on public.evidence_items(resume_id);
create unique index idx_ai_runs_cache on public.ai_runs(user_id, position_id, task, input_hash) where status = 'ready';

alter table public.resumes enable row level security;
alter table public.companies enable row level security;
alter table public.positions enable row level security;
alter table public.requirements enable row level security;
alter table public.evidence_items enable row level security;
alter table public.requirement_evidence enable row level security;
alter table public.resume_suggestions enable row level security;
alter table public.interview_questions enable row level security;
alter table public.question_followups enable row level security;
alter table public.ai_runs enable row level security;
alter table public.feedback enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['resumes','companies','positions','requirements','evidence_items','requirement_evidence','resume_suggestions','interview_questions','question_followups','ai_runs','feedback']
  loop
    execute format('create policy "users_manage_own_%1$s" on public.%1$I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', table_name);
  end loop;
end $$;
