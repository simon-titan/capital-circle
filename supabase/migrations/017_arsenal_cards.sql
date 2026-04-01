-- Arsenal: Admin-gesteuerte Karten (Tools & Fremdkapital)
create table if not exists arsenal_cards (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('tools', 'fremdkapital')),
  title text not null,
  description text,
  external_url text,
  feature_bullets jsonb default '[]'::jsonb,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_arsenal_cards_category on arsenal_cards (category);

alter table arsenal_cards enable row level security;

create policy "arsenal_cards_select_authenticated"
on arsenal_cards for select
using (auth.uid() is not null);

create policy "arsenal_cards_admin_write"
on arsenal_cards for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

-- Arsenal: Templates vs. PDFs (Anhänge pro Video, zusätzlich kategorisiert)
alter table video_attachments
  add column if not exists arsenal_kind text check (arsenal_kind is null or arsenal_kind in ('template', 'pdf'));

create index if not exists idx_video_attachments_arsenal_kind on video_attachments (arsenal_kind)
  where arsenal_kind is not null;
