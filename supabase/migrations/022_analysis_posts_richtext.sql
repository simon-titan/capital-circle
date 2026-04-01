-- Rich-Text-Artikel: Teaser + Cover-Bild (Inline-Bilder bleiben image_storage_key im JSON / bestehende Spalte)
alter table analysis_posts add column if not exists excerpt text;
alter table analysis_posts add column if not exists cover_image_storage_key text;
