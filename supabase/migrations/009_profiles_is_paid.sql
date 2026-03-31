-- Paid-Mitgliedschaft: Zugriff auf Paid-Kurse (courses.is_free = false)
alter table profiles add column if not exists is_paid boolean default false;

comment on column profiles.is_paid is 'Wenn true: Zugriff auf alle Module in Kursen mit is_free = false. Free-Kurse bleiben fuer alle sichtbar.';
