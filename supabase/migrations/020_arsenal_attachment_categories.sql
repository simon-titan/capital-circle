-- Frei definierbare Kategorien für Arsenal-Templates/PDFs (Admin)
create table if not exists arsenal_attachment_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind_scope text not null default 'both' check (kind_scope in ('template', 'pdf', 'both')),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_arsenal_attachment_categories_scope on arsenal_attachment_categories (kind_scope);

alter table video_attachments
  add column if not exists arsenal_category_id uuid references arsenal_attachment_categories(id) on delete set null;

create index if not exists idx_video_attachments_arsenal_category on video_attachments (arsenal_category_id);

alter table arsenal_attachment_categories enable row level security;

create policy "arsenal_attachment_categories_select_authenticated"
on arsenal_attachment_categories for select
using (auth.uid() is not null);

create policy "arsenal_attachment_categories_admin_write"
on arsenal_attachment_categories for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));
