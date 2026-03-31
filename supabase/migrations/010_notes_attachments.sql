-- Notizen pro Nutzer und Modul (Rich-Text HTML)
create table if not exists user_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  module_id uuid not null references modules(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, module_id)
);

create index if not exists idx_user_notes_user_id on user_notes (user_id);
create index if not exists idx_user_notes_module_id on user_notes (module_id);

alter table user_notes enable row level security;

create policy "user_notes_select_own"
on user_notes for select
using (auth.uid() = user_id);

create policy "user_notes_insert_own"
on user_notes for insert
with check (auth.uid() = user_id);

create policy "user_notes_update_own"
on user_notes for update
using (auth.uid() = user_id);

create policy "user_notes_delete_own"
on user_notes for delete
using (auth.uid() = user_id);

-- Dateianhänge pro Video (PDF etc., Key in Hetzner)
create table if not exists video_attachments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  storage_key text not null,
  filename text not null,
  content_type text,
  size_bytes bigint,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_video_attachments_video_id on video_attachments (video_id);

alter table video_attachments enable row level security;

create policy "video_attachments_select_authenticated"
on video_attachments for select
using (auth.uid() is not null);

create policy "video_attachments_admin_write"
on video_attachments for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));
