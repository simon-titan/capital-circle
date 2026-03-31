create table if not exists profiles (
  id uuid primary key,
  username text,
  full_name text,
  avatar_url text,
  discord_id text,
  discord_username text,
  discord_access_token text,
  discord_refresh_token text,
  codex_accepted boolean default false,
  codex_accepted_at timestamptz,
  intro_video_watched boolean default false,
  intro_video_watched_at timestamptz,
  streak_current int default 0,
  streak_longest int default 0,
  streak_last_activity date,
  total_learning_minutes int default 0,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  description text,
  is_free boolean default false,
  cover_image_storage_key text,
  created_at timestamptz default now()
);

create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references courses(id),
  title text not null,
  description text,
  order_index int not null,
  video_storage_key text,
  video_duration_seconds int,
  attachments jsonb,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  module_id uuid references modules(id),
  video_progress_seconds int default 0,
  video_completed boolean default false,
  quiz_passed boolean default false,
  completed boolean default false,
  completed_at timestamptz,
  unique (user_id, module_id)
);

create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  module_id uuid references modules(id) unique,
  title text,
  pass_threshold int default 100,
  questions jsonb not null
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  event_type text,
  created_by uuid references profiles(id)
);

create table if not exists homework (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  due_date date,
  week_number int,
  is_active boolean default true
);

create table if not exists discord_invites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  invite_code text,
  discord_role_id text,
  sent_at timestamptz default now(),
  role_assigned boolean default false
);

alter table profiles enable row level security;
alter table courses enable row level security;
alter table modules enable row level security;
alter table user_progress enable row level security;
alter table quizzes enable row level security;
alter table events enable row level security;
alter table homework enable row level security;
alter table discord_invites enable row level security;
