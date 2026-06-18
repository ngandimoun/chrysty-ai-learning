-- Learner memory and generation history for cross-session continuity

alter table learning_sessions
  add column if not exists learner_key text;

create index if not exists learning_sessions_learner_key_idx
  on learning_sessions(learner_key);

create table if not exists learning_learner_memory (
  learner_key text primary key,
  user_id uuid references auth.users(id) on delete set null,
  memory jsonb not null default '{}',
  narrative_digest text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists learning_learner_memory_user_id_idx
  on learning_learner_memory(user_id);

create table if not exists learning_generation_log (
  id uuid primary key default gen_random_uuid(),
  learner_key text not null,
  session_id text references learning_sessions(id) on delete cascade,
  session_type text not null,
  subject text,
  source_prompt text,
  summary jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists learning_generation_log_learner_key_idx
  on learning_generation_log(learner_key, created_at desc);

alter table learning_learner_memory enable row level security;
alter table learning_generation_log enable row level security;

create policy learning_learner_memory_select_own on learning_learner_memory
  for select using (
    user_id is null or user_id = auth.uid()
  );

create policy learning_learner_memory_insert_own on learning_learner_memory
  for insert with check (
    user_id is null or user_id = auth.uid()
  );

create policy learning_learner_memory_update_own on learning_learner_memory
  for update using (
    user_id is null or user_id = auth.uid()
  );

create policy learning_generation_log_select_own on learning_generation_log
  for select using (true);

create policy learning_generation_log_insert_own on learning_generation_log
  for insert with check (true);
