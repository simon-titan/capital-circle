-- Feste Free-Kurse: "Kostenloser Einblick" und "Aufzeichnungen".
-- Beide haben is_free = true, sind also fuer alle eingeloggten Nutzer sichtbar/zugaenglich.
-- Feste IDs fuer stabilen Bucket-Sync-Zuordnungsanker.

-- Kostenloser Einblick (Videos aus FREE-KURS/FREE-VALUE/)
insert into courses (id, title, slug, description, is_free, sort_order, is_sequential_exempt, created_at)
values (
  '00000000-0000-0000-0000-000000000010',
  'Kostenloser Einblick',
  'kostenloser-einblick',
  'Kostenlose Einfuehrung ins Capital Circle: Erste Videos und Einblicke in die Akademie.',
  true,
  -20,
  true,
  now()
)
on conflict (id) do update
  set is_free = excluded.is_free,
      is_sequential_exempt = excluded.is_sequential_exempt,
      title = excluded.title,
      slug = excluded.slug;

-- Aufzeichnungen (Live Session Recordings, fuer Free + Paid sichtbar)
insert into courses (id, title, slug, description, is_free, sort_order, is_sequential_exempt, created_at)
values (
  '00000000-0000-0000-0000-000000000011',
  'Aufzeichnungen',
  'aufzeichnungen',
  'Aufzeichnungen aus Live-Sessions und besondere Inhalte.',
  true,
  -10,
  true,
  now()
)
on conflict (id) do update
  set is_free = excluded.is_free,
      is_sequential_exempt = excluded.is_sequential_exempt,
      title = excluded.title,
      slug = excluded.slug;
