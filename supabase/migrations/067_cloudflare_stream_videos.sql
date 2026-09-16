-- Institut/Ausbildung-Videos: Migration von Hetzner S3 zu Cloudflare Stream.
-- storage_key wird NICHT geloescht/genullt — bleibt Rollback-/Audit-Pfad, auch
-- nach erfolgreicher Migration eines Videos zu Cloudflare.
alter table public.videos
  add column if not exists cloudflare_uid text,
  add column if not exists cloudflare_status text not null default 'none',
  add column if not exists cloudflare_error text,
  add column if not exists cloudflare_ready_at timestamptz;

-- `add constraint` kennt kein IF NOT EXISTS — ohne das Vorab-Loeschen bricht ein
-- zweiter Durchlauf mit 42710 ab. Die Migration soll wiederholbar bleiben.
alter table public.videos drop constraint if exists videos_cloudflare_status_check;
alter table public.videos
  add constraint videos_cloudflare_status_check
  check (cloudflare_status in ('none','pending_upload','uploading','processing','ready','error'));

-- storage_key wird fuer NEUE Videos (Cloudflare-Upload) nicht mehr zwingend benoetigt.
alter table public.videos alter column storage_key drop not null;

alter table public.videos drop constraint if exists videos_source_present_check;
alter table public.videos
  add constraint videos_source_present_check
  check (storage_key is not null or cloudflare_uid is not null);

create unique index if not exists idx_videos_cloudflare_uid
  on public.videos(cloudflare_uid) where cloudflare_uid is not null;
create index if not exists idx_videos_cloudflare_status
  on public.videos(cloudflare_status) where cloudflare_status <> 'ready';
