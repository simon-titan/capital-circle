-- Bereinigt fälschlich kaskadierte Einträge in video_progress_by_video:
-- progressSeconds des vorherigen Videos wurde unter videoId des nächsten Videos gemerged.
-- Setzt die Map für noch nicht abgeschlossene Module zurück, damit Nutzer sauber neu tracken können.

update user_progress
set video_progress_by_video = '{}'::jsonb
where completed = false
  and video_progress_by_video is not null
  and video_progress_by_video != '{}'::jsonb;
