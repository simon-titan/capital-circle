-- Entfernt ausschließlich die Demo-Daten aus supabase/seed.sql (feste UUIDs).
-- Reihenfolge wegen Foreign Keys: Progress → Quiz → Videos → Module → Kurs → Events/Hausaufgaben.
-- In Supabase: SQL Editor → ausführen.
-- Hetzner: Objekte im Bucket werden hier NICHT gelöscht (siehe Hinweis unten).

begin;

-- Demo-Modul-IDs (Kurs „Capital Circle Institut - Grundlagen“)
-- 22222222-2222-2222-2222-222222222221
-- 22222222-2222-2222-2222-222222222222
-- 22222222-2222-2222-2222-222222222223

-- Optional: Referenzen auf Demo-Videos in Fortschritt (Migration 008)
update user_progress
set last_video_id = null
where last_video_id in (
  '66666666-6666-6666-6666-666666666661',
  '66666666-6666-6666-6666-666666666662',
  '66666666-6666-6666-6666-666666666663'
);

delete from user_progress
where module_id in (
  '22222222-2222-2222-2222-222222222221',
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222223'
);

delete from quizzes
where module_id in (
  '22222222-2222-2222-2222-222222222221',
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222223'
);

-- Videos, die nur zu Demo-Modulen gehören (direkt am Modul)
delete from videos
where id in (
  '66666666-6666-6666-6666-666666666661',
  '66666666-6666-6666-6666-666666666662',
  '66666666-6666-6666-6666-666666666663'
)
   or module_id in (
  '22222222-2222-2222-2222-222222222221',
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222223'
);

-- Falls du später Subkategorien an Demo-Modulen angelegt hast:
delete from videos
where subcategory_id in (
  select id from subcategories
  where module_id in (
    '22222222-2222-2222-2222-222222222221',
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222223'
  )
);

delete from subcategories
where module_id in (
  '22222222-2222-2222-2222-222222222221',
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222223'
);

delete from modules
where id in (
  '22222222-2222-2222-2222-222222222221',
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222223'
);

delete from courses
where id = '11111111-1111-1111-1111-111111111111';

-- Demo-Events & Hausaufgabe (optional, nur Seed-IDs)
delete from events
where id in (
  '33333333-3333-3333-3333-333333333331',
  '33333333-3333-3333-3333-333333333332'
);

delete from homework
where id = '44444444-4444-4444-4444-444444444441';

commit;

-- --- Hetzner Object Storage (manuell) ---
-- Die Demo-Videos im Seed zeigen auf Keys wie:
--   videos/11111111-1111-1111-1111-111111111111/22222222-.../66666666-.../original.mp4
-- Wenn diese Dateien nur Platzhalter waren: im Hetzner-Browser unter diesem Pfad löschen.
-- Deine echten Dateien unter modules/... unangetastet lassen.
