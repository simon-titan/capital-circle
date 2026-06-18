-- Discord-Funnel: Kanal-Manager für Channel-Tracking-Links (YouTube, Instagram, TikTok …).
-- Admins legen Kanäle an; daraus entstehen fertige UTM-Links (/discord?utm_source=…).
-- Besucher-/Lead-/Join-/Booking-Counts kommen aus discord_page_visits + discord_leads
-- (gruppiert nach utm_source) — hier wird nur die Kanal-Definition gespeichert.

create table if not exists discord_channels (
  id           uuid        primary key default gen_random_uuid(),
  label        text        not null,
  utm_source   text        not null unique,
  utm_campaign text,
  created_at   timestamptz not null default now()
);

alter table discord_channels enable row level security;

-- Nur Admins dürfen lesen/schreiben (Schreibzugriff der API läuft über service-role).
create policy "admin_all_discord_channels"
  on discord_channels
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );
