-- Akademie: Modul-Slug, Thumbnail, letztes Video, Fortschritt pro Video (JSON)

alter table modules add column if not exists slug text;
create unique index if not exists idx_modules_slug on modules (slug) where slug is not null;

alter table modules add column if not exists thumbnail_storage_key text;

alter table user_progress add column if not exists last_video_id uuid references videos (id) on delete set null;

-- Map video_id -> watched seconds (fuer Multi-Video-Module)
alter table user_progress add column if not exists video_progress_by_video jsonb default '{}'::jsonb;
