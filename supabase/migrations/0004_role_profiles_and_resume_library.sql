-- OfferMap V2: multi-resume library, position bindings, immutable analysis scope,
-- application submissions, and curated role capability profiles.

alter type public.evidence_status add value if not exists 'uncertain';

create table if not exists public.resume_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  direction text not null default '',
  is_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.resumes
  add column if not exists resume_document_id uuid references public.resume_documents(id) on delete restrict,
  add column if not exists document_version integer,
  add column if not exists parse_status text not null default 'ready';

alter table public.resume_documents
  add column if not exists current_version_id uuid references public.resumes(id) on delete set null;

create unique index if not exists idx_resume_documents_default
  on public.resume_documents(user_id) where is_default and archived_at is null;
create index if not exists idx_resume_documents_user
  on public.resume_documents(user_id, created_at desc);
create unique index if not exists idx_resume_document_version
  on public.resumes(resume_document_id, document_version)
  where resume_document_id is not null and document_version is not null;

-- Migrate every existing account into one default resume document without
-- changing any existing resume ids or analysis references.
insert into public.resume_documents (user_id, name, direction, is_default)
select distinct r.user_id, '默认母版简历', '', true
from public.resumes r
where not exists (
  select 1 from public.resume_documents d where d.user_id = r.user_id
);

update public.resumes r
set resume_document_id = d.id
from public.resume_documents d
where r.resume_document_id is null
  and d.user_id = r.user_id
  and d.is_default = true;

with numbered as (
  select id, row_number() over (partition by resume_document_id order by version, created_at, id)::integer as n
  from public.resumes
  where resume_document_id is not null
)
update public.resumes r set document_version = numbered.n
from numbered where numbered.id = r.id and r.document_version is null;

update public.resume_documents d
set current_version_id = (
  select r.id
  from public.resumes r
  where r.resume_document_id = d.id
  order by r.document_version desc nulls last, r.updated_at desc
  limit 1
), updated_at = now()
where d.current_version_id is null;

create table if not exists public.position_resume_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  resume_version_id uuid not null references public.resumes(id) on delete restrict,
  status text not null check (status in ('current','history')),
  selected_by text not null default 'user' check (selected_by in ('user','system_recommended','migration')),
  selected_at timestamptz not null default now(),
  ended_at timestamptz
);

create unique index if not exists idx_position_resume_current
  on public.position_resume_bindings(position_id) where status = 'current';
create index if not exists idx_position_resume_history
  on public.position_resume_bindings(position_id, selected_at desc);
create index if not exists idx_resume_version_bindings
  on public.position_resume_bindings(resume_version_id);

insert into public.position_resume_bindings (user_id, position_id, resume_version_id, status, selected_by)
select p.user_id, p.id, p.resume_id, 'current', 'migration'
from public.positions p
where p.resume_id is not null
  and not exists (
    select 1 from public.position_resume_bindings b
    where b.position_id = p.id and b.status = 'current'
  );

alter table public.positions
  add column if not exists industry text not null default '',
  add column if not exists seniority text not null default 'early_career',
  add column if not exists product_type text not null default '',
  add column if not exists company_type text not null default '',
  add column if not exists position_revision integer not null default 1,
  add column if not exists canonical_role_id uuid;

create table if not exists public.application_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  resume_version_id uuid not null references public.resumes(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  channel text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_submissions_position
  on public.application_submissions(position_id, submitted_at desc);
create index if not exists idx_submissions_resume
  on public.application_submissions(resume_version_id);

create table if not exists public.role_taxonomies (
  id uuid primary key default gen_random_uuid(),
  canonical_title text not null,
  role_family text not null,
  aliases jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('draft','active','archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.role_profiles (
  id uuid primary key default gen_random_uuid(),
  role_taxonomy_id uuid not null references public.role_taxonomies(id) on delete cascade,
  industry text not null default '通用',
  seniority text not null default '实习与校招',
  product_type text not null default '',
  version integer not null default 1,
  sample_count integer not null default 0,
  company_count integer not null default 0,
  effective_from timestamptz not null default now(),
  generated_at timestamptz not null default now(),
  reviewed_status text not null default 'curated_seed' check (reviewed_status in ('draft','curated_seed','reviewed','archived')),
  source_summary text not null default 'OfferMap 人工种子库；待接入合规岗位样本',
  unique (role_taxonomy_id, industry, seniority, product_type, version)
);

create table if not exists public.role_requirements (
  id uuid primary key default gen_random_uuid(),
  role_profile_id uuid not null references public.role_profiles(id) on delete cascade,
  label text not null,
  description text not null,
  category text not null,
  prevalence_level text not null check (prevalence_level in ('high','common','occasional','low')),
  confidence numeric not null default 0.7,
  source_count integer not null default 0,
  display_order integer not null default 0,
  unique (role_profile_id, label)
);

create table if not exists public.requirement_sources (
  id uuid primary key default gen_random_uuid(),
  role_requirement_id uuid not null references public.role_requirements(id) on delete cascade,
  source_type text not null,
  source_title text not null,
  source_date date,
  excerpt text not null default '',
  usage_rights text not null default 'curated_summary',
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'positions_canonical_role_fk'
  ) then
    alter table public.positions
      add constraint positions_canonical_role_fk foreign key (canonical_role_id)
      references public.role_taxonomies(id) on delete set null;
  end if;
end $$;

alter table public.positions
  add column if not exists role_profile_id uuid references public.role_profiles(id) on delete set null;

create table if not exists public.benchmark_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  resume_version_id uuid not null references public.resumes(id) on delete restrict,
  role_profile_id uuid not null references public.role_profiles(id) on delete restrict,
  role_profile_version integer not null,
  role_requirement_id uuid not null references public.role_requirements(id) on delete cascade,
  status text not null check (status in ('strong','partial','missing','uncertain')),
  resume_quotes jsonb not null default '[]'::jsonb,
  rationale text not null,
  missing_information text not null default '',
  action text not null default '',
  confidence numeric,
  citation_verified boolean not null default false,
  user_confirmed boolean,
  ignored_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_benchmark_evidence_scope
  on public.benchmark_evidence(position_id, resume_version_id, role_profile_id, created_at desc);

alter table public.ai_runs
  add column if not exists position_revision integer,
  add column if not exists resume_version_id uuid references public.resumes(id) on delete set null,
  add column if not exists role_profile_id uuid references public.role_profiles(id) on delete set null,
  add column if not exists role_profile_version integer,
  add column if not exists result_snapshot jsonb,
  add column if not exists attempt integer not null default 1,
  add column if not exists completed_at timestamptz;

create table if not exists public.analysis_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  position_id uuid not null references public.positions(id) on delete cascade,
  analysis_type text not null check (analysis_type in ('jd_evidence','benchmark','resume_core','resume_expand','interview_core','interview_expand')),
  position_revision integer not null,
  resume_version_id uuid not null references public.resumes(id) on delete restrict,
  role_profile_id uuid references public.role_profiles(id) on delete set null,
  role_profile_version integer,
  prompt_version text not null,
  model text not null,
  result_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_analysis_snapshots_scope
  on public.analysis_snapshots(position_id, resume_version_id, created_at desc);

-- Curated role seed library. These records are deliberately presented as a
-- baseline, not as a company's explicit hiring standard.
insert into public.role_taxonomies (id, canonical_title, role_family, aliases, status) values
  ('10000000-0000-4000-8000-000000000001', 'AI 产品经理', 'product', '["AI产品经理","人工智能产品经理","Agent产品经理","大模型产品经理"]', 'active'),
  ('10000000-0000-4000-8000-000000000002', '产品经理', 'product', '["产品实习生","产品经理实习生","产品策划"]', 'active'),
  ('10000000-0000-4000-8000-000000000003', '后端开发工程师', 'technology', '["后端开发","服务端开发","Java开发","Go开发"]', 'active'),
  ('10000000-0000-4000-8000-000000000004', '用户增长运营', 'operations', '["增长运营","用户运营","活动运营"]', 'active'),
  ('10000000-0000-4000-8000-000000000005', '市场营销', 'marketing', '["市场实习生","品牌营销","整合营销","商业化市场"]', 'active')
on conflict (id) do update set aliases = excluded.aliases, status = excluded.status;

insert into public.role_profiles (id, role_taxonomy_id, industry, seniority, version, reviewed_status, source_summary) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '通用', '实习与校招', 1, 'curated_seed', 'OfferMap 人工种子库 v1；不代表当前公司明确要求'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', '通用', '实习与校招', 1, 'curated_seed', 'OfferMap 人工种子库 v1；不代表当前公司明确要求'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', '通用', '实习与校招', 1, 'curated_seed', 'OfferMap 人工种子库 v1；不代表当前公司明确要求'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', '通用', '实习与校招', 1, 'curated_seed', 'OfferMap 人工种子库 v1；不代表当前公司明确要求'),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', '通用', '实习与校招', 1, 'curated_seed', 'OfferMap 人工种子库 v1；不代表当前公司明确要求')
on conflict (id) do update set source_summary = excluded.source_summary, reviewed_status = excluded.reviewed_status;

insert into public.role_requirements (role_profile_id, label, description, category, prevalence_level, confidence, display_order) values
  ('20000000-0000-4000-8000-000000000001','用户需求与场景抽象','从用户、业务和技术约束中识别真实问题，并形成可验证的产品需求。','专业能力','high',0.84,1),
  ('20000000-0000-4000-8000-000000000001','AI 能力边界判断','理解模型、数据和评测的基本边界，能够判断 AI 方案何时可用。','AI与技术','high',0.82,2),
  ('20000000-0000-4000-8000-000000000001','产品方案与优先级','将复杂目标拆解为产品方案、迭代节奏和清晰优先级。','专业能力','high',0.83,3),
  ('20000000-0000-4000-8000-000000000001','效果评测与迭代','设计指标或评测方法，结合结果持续优化产品。','数据与评测','common',0.79,4),
  ('20000000-0000-4000-8000-000000000001','跨团队推进','与算法、研发、设计和业务共同推进方案落地。','通用能力','common',0.80,5),
  ('20000000-0000-4000-8000-000000000002','用户研究','通过访谈、数据或观察识别用户问题和使用场景。','专业能力','high',0.84,1),
  ('20000000-0000-4000-8000-000000000002','需求分析与产品设计','把问题转化为可落地的流程、交互和功能方案。','专业能力','high',0.86,2),
  ('20000000-0000-4000-8000-000000000002','数据验证','使用指标和实验判断产品方案是否有效。','数据能力','common',0.80,3),
  ('20000000-0000-4000-8000-000000000002','项目推进','协调多方资源，把控范围、节奏和风险。','通用能力','common',0.79,4),
  ('20000000-0000-4000-8000-000000000003','编程与工程基础','使用岗位相关语言和工程工具完成可维护的服务端开发。','专业能力','high',0.88,1),
  ('20000000-0000-4000-8000-000000000003','数据结构与系统原理','理解常见数据结构、网络、数据库和操作系统原理。','技术基础','high',0.87,2),
  ('20000000-0000-4000-8000-000000000003','系统设计与权衡','能说明架构选择、性能、可靠性和复杂度之间的权衡。','专业能力','common',0.80,3),
  ('20000000-0000-4000-8000-000000000003','故障排查','能够定位问题、验证假设并形成复盘。','专业能力','common',0.81,4),
  ('20000000-0000-4000-8000-000000000004','用户分层','根据行为、生命周期或价值差异设计分层策略。','专业能力','high',0.84,1),
  ('20000000-0000-4000-8000-000000000004','增长策略与执行','围绕拉新、激活、留存或转化设计并落地运营动作。','专业能力','high',0.86,2),
  ('20000000-0000-4000-8000-000000000004','数据复盘','定义过程和结果指标，解释变化并沉淀迭代动作。','数据能力','common',0.82,3),
  ('20000000-0000-4000-8000-000000000004','内容与活动协同','结合内容、活动和渠道完成用户触达。','专业能力','common',0.76,4),
  ('20000000-0000-4000-8000-000000000005','市场洞察与人群','理解目标人群、竞争环境和市场机会。','专业能力','high',0.84,1),
  ('20000000-0000-4000-8000-000000000005','定位与传播策略','形成清晰定位、信息表达和传播组合。','专业能力','high',0.83,2),
  ('20000000-0000-4000-8000-000000000005','渠道与项目执行','选择渠道并推进营销项目按节奏落地。','专业能力','common',0.79,3),
  ('20000000-0000-4000-8000-000000000005','投入产出复盘','结合预算、触达、转化等信息评估营销效果。','数据能力','common',0.80,4)
on conflict (role_profile_id, label) do update set
  description = excluded.description,
  category = excluded.category,
  prevalence_level = excluded.prevalence_level,
  confidence = excluded.confidence,
  display_order = excluded.display_order;

alter table public.resume_documents enable row level security;
alter table public.position_resume_bindings enable row level security;
alter table public.application_submissions enable row level security;
alter table public.role_taxonomies enable row level security;
alter table public.role_profiles enable row level security;
alter table public.role_requirements enable row level security;
alter table public.requirement_sources enable row level security;
alter table public.benchmark_evidence enable row level security;
alter table public.analysis_snapshots enable row level security;

drop policy if exists "users_manage_own_resume_documents" on public.resume_documents;
create policy "users_manage_own_resume_documents" on public.resume_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users_manage_own_position_resume_bindings" on public.position_resume_bindings;
create policy "users_manage_own_position_resume_bindings" on public.position_resume_bindings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users_manage_own_application_submissions" on public.application_submissions;
create policy "users_manage_own_application_submissions" on public.application_submissions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users_manage_own_benchmark_evidence" on public.benchmark_evidence;
create policy "users_manage_own_benchmark_evidence" on public.benchmark_evidence
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "users_manage_own_analysis_snapshots" on public.analysis_snapshots;
create policy "users_manage_own_analysis_snapshots" on public.analysis_snapshots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "authenticated_read_role_taxonomies" on public.role_taxonomies;
create policy "authenticated_read_role_taxonomies" on public.role_taxonomies
  for select to authenticated using (status = 'active');
drop policy if exists "authenticated_read_role_profiles" on public.role_profiles;
create policy "authenticated_read_role_profiles" on public.role_profiles
  for select to authenticated using (reviewed_status in ('curated_seed','reviewed'));
drop policy if exists "authenticated_read_role_requirements" on public.role_requirements;
create policy "authenticated_read_role_requirements" on public.role_requirements
  for select to authenticated using (true);
drop policy if exists "authenticated_read_requirement_sources" on public.requirement_sources;
create policy "authenticated_read_requirement_sources" on public.requirement_sources
  for select to authenticated using (true);
