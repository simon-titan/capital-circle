-- Free-Freischaltung fuer Downloads.
-- Default = false: Alle bestehenden Anhaenge bleiben Paid-only.
-- Admin kann pro Attachment manuell auf true setzen (sichtbar fuer Free-Kurs-Nutzer).

alter table standalone_attachments
  add column if not exists is_free boolean not null default false;

alter table video_attachments
  add column if not exists is_free boolean not null default false;

comment on column standalone_attachments.is_free is
  'Wenn true: Attachment auch fuer Free-Nutzer (ohne profiles.is_paid) downloadbar.';
comment on column video_attachments.is_free is
  'Wenn true: Attachment auch fuer Free-Nutzer (ohne profiles.is_paid) downloadbar.';
