-- PDFs/Templates ohne Modul- oder Video-Zuordnung (Arsenal, eigenständig)
create table if not exists standalone_attachments (
  id uuid primary key default gen_random_uuid(),
  storage_key text not null,
  filename text not null,
  content_type text,
  size_bytes bigint,
  kind text not null check (kind in ('pdf', 'template')),
  category_id uuid references arsenal_attachment_categories(id) on delete set null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_standalone_attachments_kind on standalone_attachments (kind);
create index if not exists idx_standalone_attachments_position on standalone_attachments (position asc);

alter table standalone_attachments enable row level security;

create policy "standalone_attachments_select_authenticated"
on standalone_attachments for select
using (auth.uid() is not null);

create policy "standalone_attachments_admin_write"
on standalone_attachments for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));
