-- ═══════════════════════════════════════
--  Pixel HQ — Database Schema
--  실행 방법: Supabase 대시보드 > SQL Editor에 붙여넣기 후 Run
-- ═══════════════════════════════════════

-- Projects 테이블
create table public.projects (
  id            bigint primary key generated always as identity,
  user_id       uuid not null references auth.users(id) on delete cascade,

  -- 기본 정보
  name          text not null,
  status        text not null default 'active'
                  check (status in ('active', 'pivot', 'paused', 'complete')),
  progress      integer not null default 0
                  check (progress >= 0 and progress <= 100),
  priority      text not null default 'medium'
                  check (priority in ('high', 'medium', 'low')),
  last_activity date not null default current_date,
  room          text not null default 'lab',

  -- 링크
  server_url    text,
  github_url    text,
  thumbnail     text,

  -- 포트폴리오
  description   text,
  featured      boolean not null default false,
  start_date    date,
  end_date      date,

  -- 배열/JSON
  stack         text[]  not null default '{}',
  tasks         jsonb   not null default '[]',

  -- 메타
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Row Level Security (각 유저는 자기 프로젝트만 접근)
alter table public.projects enable row level security;

create policy "select_own" on public.projects
  for select using (auth.uid() = user_id);

create policy "insert_own" on public.projects
  for insert with check (auth.uid() = user_id);

create policy "update_own" on public.projects
  for update using (auth.uid() = user_id);

create policy "delete_own" on public.projects
  for delete using (auth.uid() = user_id);

-- updated_at 자동 갱신 트리거
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

-- 성능 인덱스
create index idx_projects_user_id on public.projects(user_id);
create index idx_projects_status   on public.projects(status);
create index idx_projects_featured on public.projects(featured) where featured = true;

-- Realtime 구독 허용
alter publication supabase_realtime add table public.projects;
