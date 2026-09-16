-- Nicht zugeordnete Videos: ein Ablagestapel im Admin, aus dem Videos per
-- Drag & Drop in Module und Untermodule gezogen werden.
--
-- Hintergrund: Nach der Umstellung auf Cloudflare Stream lagen 73 fertig
-- verarbeitete Videos im Stream-Konto, zu denen es keine Datenbankzeile gab —
-- sie waren in der Plattform schlicht unsichtbar. Statt sie beim Import blind
-- irgendeinem Modul zuzuschlagen, bekommen sie gar keinen Platz und werden im
-- Admin von Hand einsortiert.
--
-- `video_parent_check` aus Migration 007 verlangte bisher GENAU einen Elternteil
-- (Modul oder Untermodul). Ab hier sind HOECHSTENS einer erlaubt: beide null
-- heisst "liegt im Stapel". Die bisherigen Kombinationen bleiben unveraendert
-- gueltig, die Aenderung ist also rein erweiternd.
--
-- Wiederholbar: `drop constraint if exists` vor dem `add constraint`.

alter table public.videos drop constraint if exists video_parent_check;

alter table public.videos
  add constraint video_parent_check check (
    -- genau im Modul
    (module_id is not null and subcategory_id is null)
    -- genau im Untermodul
    or (module_id is null and subcategory_id is not null)
    -- im Stapel, noch nicht einsortiert
    or (module_id is null and subcategory_id is null)
  );

-- Der Stapel wird bei jedem Oeffnen des Modul-Editors gelesen. Ein Teilindex
-- haelt das billig, auch wenn die `videos`-Tabelle waechst.
create index if not exists idx_videos_unassigned
  on public.videos(created_at desc)
  where module_id is null and subcategory_id is null;

-- Sicherheitsnetz: Ein Video im Stapel darf niemals veroeffentlicht sein — es
-- haengt an keinem Modul und waere ueber die Playlist ohnehin nicht erreichbar,
-- aber `is_published = true` wuerde es in Zaehlungen und Fortschritt mitschleppen.
create or replace function public.videos_unassigned_not_published()
returns trigger
language plpgsql
as $$
begin
  if new.module_id is null and new.subcategory_id is null then
    new.is_published := false;
  end if;
  return new;
end
$$;

drop trigger if exists trg_videos_unassigned_not_published on public.videos;
create trigger trg_videos_unassigned_not_published
before insert or update on public.videos
for each row execute function public.videos_unassigned_not_published();
