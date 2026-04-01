create table if not exists analysis_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null default '',
  image_storage_key text,
  post_type text not null check (post_type in ('weekly', 'daily')),
  published_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_analysis_posts_published on analysis_posts (published_at desc);

alter table analysis_posts enable row level security;

create policy "analysis_posts_select_authenticated"
on analysis_posts for select
using (auth.uid() is not null);

create policy "analysis_posts_admin_write"
on analysis_posts for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));
