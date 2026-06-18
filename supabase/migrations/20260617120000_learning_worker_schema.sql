-- Learning worker schema for chrysty.dev (isolated from other workers)
-- Safe: only creates learning_* tables + activates tutor worker row

create extension if not exists "pgcrypto";

insert into public.workers (slug, name, status)
values ('tutor', 'Chrysty AI Learning', 'active')
on conflict (slug) do update
  set name = excluded.name,
      status = excluded.status;

create table if not exists learning_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  platform_workspace_id uuid references worker_workspaces(id) on delete set null,
  name text not null default 'My Learning',
  is_default boolean not null default true,
  settings jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_workspaces_user_id_idx on learning_workspaces(user_id);

create table if not exists learning_sessions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  workspace_id uuid references learning_workspaces(id) on delete set null,
  worker_slug text not null default 'tutor',
  type text not null check (type in ('learn', 'practice', 'think')),
  title text not null,
  current_topic text not null default 'Getting Started',
  progress smallint not null default 0 check (progress >= 0 and progress <= 100),
  source_prompt text,
  content jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists learning_sessions_user_id_idx on learning_sessions(user_id);
create index if not exists learning_sessions_type_idx on learning_sessions(type);
create index if not exists learning_sessions_updated_at_idx on learning_sessions(updated_at desc);

create table if not exists learning_interactions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references learning_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action_type text not null check (
    action_type in (
      'learn_guidance',
      'think_debate',
      'practice_grade',
      'answer',
      'reflection'
    )
  ),
  card_id text,
  user_message text not null default '',
  ai_response text not null default '',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists learning_interactions_session_id_idx
  on learning_interactions(session_id, created_at desc);

create table if not exists learning_files (
  id text primary key,
  user_id uuid references auth.users(id) on delete set null,
  moonshot_id text not null,
  filename text not null,
  purpose text not null check (purpose in ('file-extract', 'image', 'video')),
  mime_type text not null,
  content text,
  media_url text,
  created_at timestamptz not null default now()
);

create index if not exists learning_files_user_id_idx on learning_files(user_id);

create table if not exists learning_session_files (
  session_id text not null references learning_sessions(id) on delete cascade,
  file_id text not null references learning_files(id) on delete cascade,
  primary key (session_id, file_id)
);

-- RLS
alter table learning_workspaces enable row level security;
alter table learning_sessions enable row level security;
alter table learning_interactions enable row level security;
alter table learning_files enable row level security;
alter table learning_session_files enable row level security;

create policy learning_workspaces_select_own on learning_workspaces
  for select using (user_id is null or user_id = auth.uid());

create policy learning_workspaces_insert_own on learning_workspaces
  for insert with check (user_id is null or user_id = auth.uid());

create policy learning_workspaces_update_own on learning_workspaces
  for update using (user_id is null or user_id = auth.uid());

create policy learning_workspaces_delete_own on learning_workspaces
  for delete using (user_id is null or user_id = auth.uid());

create policy learning_sessions_select_own on learning_sessions
  for select using (user_id is null or user_id = auth.uid());

create policy learning_sessions_insert_own on learning_sessions
  for insert with check (user_id is null or user_id = auth.uid());

create policy learning_sessions_update_own on learning_sessions
  for update using (user_id is null or user_id = auth.uid());

create policy learning_sessions_delete_own on learning_sessions
  for delete using (user_id is null or user_id = auth.uid());

create policy learning_interactions_select_own on learning_interactions
  for select using (
    user_id is null
    or user_id = auth.uid()
    or exists (
      select 1 from learning_sessions s
      where s.id = learning_interactions.session_id
        and (s.user_id is null or s.user_id = auth.uid())
    )
  );

create policy learning_interactions_insert_own on learning_interactions
  for insert with check (
    user_id is null
    or user_id = auth.uid()
    or exists (
      select 1 from learning_sessions s
      where s.id = learning_interactions.session_id
        and (s.user_id is null or s.user_id = auth.uid())
    )
  );

create policy learning_files_select_own on learning_files
  for select using (user_id is null or user_id = auth.uid());

create policy learning_files_insert_own on learning_files
  for insert with check (user_id is null or user_id = auth.uid());

create policy learning_files_delete_own on learning_files
  for delete using (user_id is null or user_id = auth.uid());

create policy learning_session_files_select_own on learning_session_files
  for select using (
    exists (
      select 1 from learning_sessions s
      where s.id = learning_session_files.session_id
        and (s.user_id is null or s.user_id = auth.uid())
    )
  );

create policy learning_session_files_insert_own on learning_session_files
  for insert with check (
    exists (
      select 1 from learning_sessions s
      where s.id = learning_session_files.session_id
        and (s.user_id is null or s.user_id = auth.uid())
    )
  );

create policy learning_session_files_delete_own on learning_session_files
  for delete using (
    exists (
      select 1 from learning_sessions s
      where s.id = learning_session_files.session_id
        and (s.user_id is null or s.user_id = auth.uid())
    )
  );
