-- 116 · Geheimhaltungsvereinbarung für zahlende Mitglieder (15.11.2026)
--
-- Jedes Konto mit `is_paid` stimmt einmal je Fassung zu, bevor es die
-- Plattform weiter nutzt (Popup, `components/platform/shell/GeheimhaltungPopup.tsx`).
-- Free-Mitglieder und Admins betrifft das nicht. Fassung und Text stehen in
-- `config/geheimhaltung.ts`; eine neue Fassung fragt alle erneut.
--
-- Nachweis: Name, Zeitpunkt, IP und Browser — wie eine Unterschrift. Zeilen
-- werden nie geändert oder gelöscht (nur Service-Client schreibt).

create table if not exists public.geheimhaltung_zustimmung (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  fassung        text        not null,
  -- Vom Mitglied eingetippter vollständiger Name (Unterschrift).
  name           text        not null,
  email          text        not null,
  zugestimmt_am  timestamptz not null default now(),
  ip             text,
  user_agent     text,
  unique (user_id, fassung)
);

create index if not exists geheimhaltung_zustimmung_zeit_idx on public.geheimhaltung_zustimmung (zugestimmt_am desc);

alter table public.geheimhaltung_zustimmung enable row level security;

drop policy if exists geheimhaltung_zustimmung_eigene on public.geheimhaltung_zustimmung;
create policy geheimhaltung_zustimmung_eigene on public.geheimhaltung_zustimmung
  for select to authenticated using (user_id = auth.uid());

comment on table public.geheimhaltung_zustimmung is
  'Zustimmungen zur Geheimhaltungsvereinbarung je Fassung (config/geheimhaltung.ts). Nur zahlende Mitglieder. Migration 116.';
