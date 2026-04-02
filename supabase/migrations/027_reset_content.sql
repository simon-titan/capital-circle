-- Einmaliger Reset: Akademie-Inhalte leeren (S3 bleibt Quelle der Wahrheit).
-- Eine Anweisung: Postgres sortiert nach FKs.

truncate table
  user_progress,
  user_notes,
  quizzes,
  video_attachments,
  videos,
  subcategories,
  modules,
  courses
restart identity cascade;

-- Deduplizierung beim Bucket-Scan: roher Ordnername pro Kurs
alter table modules add column if not exists storage_folder_key text;

create unique index if not exists idx_modules_course_storage_folder_key
  on modules (course_id, storage_folder_key)
  where storage_folder_key is not null;

-- Letzter Test-Score (auch bei Nicht-Bestehen), für Sidebar-Status
alter table user_progress add column if not exists quiz_last_score int;
