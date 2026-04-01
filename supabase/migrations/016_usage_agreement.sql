-- Vereinbarung zur Nutzung und Vertraulichkeit (Onboarding-Gate)
alter table profiles
  add column if not exists usage_agreement_accepted boolean not null default false,
  add column if not exists usage_agreement_accepted_at timestamptz;

-- Bestandsnutzer mit abgeschlossenem Onboarding: als akzeptiert setzen (kein erneuter Schritt)
update profiles
set
  usage_agreement_accepted = true,
  usage_agreement_accepted_at = coalesce(intro_video_watched_at, codex_accepted_at, created_at)
where
  codex_accepted = true
  and intro_video_watched = true
  and usage_agreement_accepted = false;
