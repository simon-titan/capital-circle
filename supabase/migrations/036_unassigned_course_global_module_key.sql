-- Globaler unique Index: storage_folder_key darf nur einmal existieren (kursübergreifend).
-- Ersetzt den bisherigen (course_id, storage_folder_key)-Index, der Duplikate über Kurse hinweg erlaubte.
DROP INDEX IF EXISTS idx_modules_course_storage_folder_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_modules_storage_folder_key_global
  ON modules (storage_folder_key)
  WHERE storage_folder_key IS NOT NULL;

-- "Nicht zugeordnet"-Kurs mit fester ID und reserviertem Slug.
-- Wird nie in der Plattform angezeigt (kein gültiger Slug, is_free = false).
-- Neue Module aus dem Bucket-Scan landen hier, bis ein Admin sie zuordnet.
INSERT INTO courses (id, title, slug, description, is_free)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Nicht zugeordnet',
  '__unassigned__',
  'Interne Sammlung für Module ohne Kurszuordnung.',
  false
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  slug  = EXCLUDED.slug;
