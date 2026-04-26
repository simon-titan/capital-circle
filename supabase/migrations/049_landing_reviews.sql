-- Landing reviews: Admin-managed testimonials for landing pages.
-- Each review belongs to a landing_slug (e.g. 'bewerbung', 'insight', 'global').

create table if not exists public.landing_reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rating int not null default 5 check (rating >= 1 and rating <= 5),
  title text not null default '',
  body text not null default '',
  date_label text not null default '',
  avatar_url text,
  landing_slug text not null default 'global',
  visible boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists landing_reviews_slug_visible
  on public.landing_reviews (landing_slug, visible);

-- RLS
alter table public.landing_reviews enable row level security;

create policy "Anyone can read visible reviews"
  on public.landing_reviews for select
  using (visible = true);

create policy "Admins can do everything with reviews"
  on public.landing_reviews for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Seed: placeholder reviews for /bewerbung (male names, no "kostenlos")
insert into public.landing_reviews (name, rating, title, body, date_label, avatar_url, landing_slug, sort_order) values
  ('Maximilian R.', 5, 'Endlich ein strukturierter Ansatz',
   'Ich habe vorher unzählige YouTube-Videos und Kurse konsumiert — immer das gleiche oberflächliche Zeug. Capital Circle hat mir zum ersten Mal gezeigt, wie professionelles Trading wirklich funktioniert. Das Fundament stimmt.',
   'März 2026', '/client-pb/1765279404415.jpg', 'bewerbung', 1),
  ('Leon K.', 5, 'Mehr als erwartet',
   'Ich war skeptisch, ob ein Programm wirklich diesen Mehrwert liefern kann. Aber Emre gibt alles — kein Fluff, kein Upsell-Druck. Einfach ehrliches Wissen, das mir direkt geholfen hat meine Drawdowns zu reduzieren.',
   'April 2026', '/client-pb/393d1b15978eed96285cf196b2f51eda.avif', 'bewerbung', 2),
  ('Jonas T.', 5, 'Community macht den Unterschied',
   'Das Onboarding war top, aber was mich wirklich überzeugt hat ist die Community. Trader, die tatsächlich wissen wovon sie reden. Kein Spam, keine Signale — nur echter Austausch auf hohem Niveau.',
   'Februar 2026', '/client-pb/4208db19763848b131989eadba9899aa.avif', 'bewerbung', 3),
  ('Niklas W.', 4, 'Solider Einstieg',
   'Das Programm ist sehr gut aufgebaut und Emre erklärt komplexe Konzepte verständlich. Besonders das Kapitel über Risk-Management hat mir die Augen geöffnet. Klare Empfehlung für alle, die es ernst meinen.',
   'März 2026', '/client-pb/user_6819319_6ec853ff-5777-4398-8fcc-06e2621cbcf8.avif', 'bewerbung', 4);
