-- Dashboard: Fortschritt-Zeitstempel, optionale Hausaufgaben-Links, Indizes

alter table user_progress add column if not exists updated_at timestamptz default now();

update user_progress set updated_at = coalesce(completed_at, now()) where updated_at is null;

create index if not exists idx_user_progress_user_updated on user_progress (user_id, updated_at desc);

create index if not exists idx_user_progress_user_completed on user_progress (user_id, completed);

alter table homework add column if not exists link text;

alter table homework add column if not exists link_label text;
