-- Kurs-Icon und Akzentfarbe für die Institut-Seite
alter table courses
  add column if not exists icon text default null,
  add column if not exists accent_color text default null;
