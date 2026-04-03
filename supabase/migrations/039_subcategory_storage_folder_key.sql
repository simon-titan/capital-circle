-- Stabiler Anker für Bucket-Sync: Unterordner-Name im Storage (nicht humanisierter Titel).
ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS storage_folder_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subcategories_module_storage_folder_key
  ON subcategories (module_id, storage_folder_key)
  WHERE storage_folder_key IS NOT NULL;
