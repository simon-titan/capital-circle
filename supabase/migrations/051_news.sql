-- Capital Circle News: kompakter Post-/Blog-Feed mit Like, Kommentar (max. 1 pro User/Post) und Save.
-- Sichtbar fuer alle authentifizierten Nutzer (Free + Paid), Admin-only Write.

-- ============================================================
-- 1) news_posts: Haupttabelle fuer Posts
-- ============================================================
create table if not exists news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null default '',
  excerpt text,
  cover_image_storage_key text,
  published_at timestamptz not null default now(),
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_news_posts_published on news_posts (published_at desc);

alter table news_posts enable row level security;

create policy "news_posts_select_authenticated"
on news_posts for select
using (auth.uid() is not null);

create policy "news_posts_admin_write"
on news_posts for all
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true))
with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

-- ============================================================
-- 2) news_likes: Like pro (post, user) — unique
-- ============================================================
create table if not exists news_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references news_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists idx_news_likes_post on news_likes (post_id);
create index if not exists idx_news_likes_user on news_likes (user_id);

alter table news_likes enable row level security;

create policy "news_likes_select_authenticated"
on news_likes for select
using (auth.uid() is not null);

create policy "news_likes_insert_own"
on news_likes for insert
with check (auth.uid() = user_id);

create policy "news_likes_delete_own"
on news_likes for delete
using (auth.uid() = user_id);

-- ============================================================
-- 3) news_comments: max. 1 Kommentar pro User pro Post
-- ============================================================
create table if not exists news_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references news_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists idx_news_comments_post on news_comments (post_id, created_at desc);
create index if not exists idx_news_comments_user on news_comments (user_id);

alter table news_comments enable row level security;

create policy "news_comments_select_authenticated"
on news_comments for select
using (auth.uid() is not null);

create policy "news_comments_insert_own"
on news_comments for insert
with check (auth.uid() = user_id);

create policy "news_comments_update_own"
on news_comments for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "news_comments_delete_own"
on news_comments for delete
using (auth.uid() = user_id);

-- Admins duerfen Kommentare moderieren
create policy "news_comments_admin_delete"
on news_comments for delete
using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin = true));

-- ============================================================
-- 4) news_saves: Bookmarks — unique pro (post, user)
-- ============================================================
create table if not exists news_saves (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references news_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists idx_news_saves_user on news_saves (user_id, created_at desc);

alter table news_saves enable row level security;

create policy "news_saves_select_own"
on news_saves for select
using (auth.uid() = user_id);

create policy "news_saves_insert_own"
on news_saves for insert
with check (auth.uid() = user_id);

create policy "news_saves_delete_own"
on news_saves for delete
using (auth.uid() = user_id);

-- ============================================================
-- 5) news_read_status: last_seen_at fuer Unread-Badge in der Navbar
-- ============================================================
create table if not exists news_read_status (
  user_id uuid primary key references profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table news_read_status enable row level security;

create policy "news_read_status_select_own"
on news_read_status for select
using (auth.uid() = user_id);

create policy "news_read_status_insert_own"
on news_read_status for insert
with check (auth.uid() = user_id);

create policy "news_read_status_update_own"
on news_read_status for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- updated_at Trigger fuer news_posts
create or replace function news_posts_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_news_posts_updated_at on news_posts;
create trigger trg_news_posts_updated_at
before update on news_posts
for each row execute function news_posts_set_updated_at();

-- updated_at Trigger fuer news_comments
create or replace function news_comments_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_news_comments_updated_at on news_comments;
create trigger trg_news_comments_updated_at
before update on news_comments
for each row execute function news_comments_set_updated_at();
