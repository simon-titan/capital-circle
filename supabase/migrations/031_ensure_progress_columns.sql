-- Stellt sicher, dass alle user_progress-Spalten existieren die in späteren Migrationen
-- hinzugefügt wurden. Idempotent (IF NOT EXISTS), kann mehrfach ausgeführt werden.

alter table user_progress add column if not exists updated_at timestamptz default now();
alter table user_progress add column if not exists last_video_id uuid references videos (id) on delete set null;
alter table user_progress add column if not exists video_progress_by_video jsonb default '{}'::jsonb;
alter table user_progress add column if not exists quiz_last_score int;

-- Indizes aus 006_dashboard (falls fehlend)
create index if not exists idx_user_progress_user_updated on user_progress (user_id, updated_at desc);
create index if not exists idx_user_progress_user_completed on user_progress (user_id, completed);

-- Modul-Slug und Thumbnail (008_academy_flat)
alter table modules add column if not exists slug text;
create unique index if not exists idx_modules_slug on modules (slug) where slug is not null;
alter table modules add column if not exists thumbnail_storage_key text;

-- is_paid auf profiles (009_profiles_is_paid)
alter table profiles add column if not exists is_paid boolean default false;

-- quiz_mode auf quizzes (011_quiz_mode)
alter table quizzes add column if not exists quiz_mode text default 'multi_page';

-- storage_folder_key auf modules (027_reset_content)
alter table modules add column if not exists storage_folder_key text;
create unique index if not exists idx_modules_course_storage_folder_key
  on modules (course_id, storage_folder_key)
  where storage_folder_key is not null;
