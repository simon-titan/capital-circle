-- Demo Course
insert into courses (id, title, slug, description, is_free)
values
  ('11111111-1111-1111-1111-111111111111', 'Capital Circle Institut - Grundlagen', 'capital-circle-grundlagen', 'Der zentrale Einstiegskurs.', true)
on conflict (id) do update
set title = excluded.title,
    slug = excluded.slug,
    description = excluded.description,
    is_free = excluded.is_free;

-- Demo Modules
insert into modules (id, course_id, title, description, order_index, is_published)
values
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Modul 1: Marktstruktur', 'Grundlagen zur Marktstruktur und Preislogik.', 1, true),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Modul 2: Risiko', 'Risikomanagement als Kern der Disziplin.', 2, true),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Modul 3: Setups', 'Kontextbasierte Setup-Auswahl.', 3, true)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    order_index = excluded.order_index;

-- Demo Videos (Platzhalter-Keys bis Upload)
insert into videos (id, module_id, subcategory_id, title, position, storage_key, duration_seconds, is_published)
values
  ('66666666-6666-6666-6666-666666666661', '22222222-2222-2222-2222-222222222221', null, 'Modul 1: Marktstruktur', 0, 'videos/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222221/66666666-6666-6666-6666-666666666661/original.mp4', 1200, true),
  ('66666666-6666-6666-6666-666666666662', '22222222-2222-2222-2222-222222222222', null, 'Modul 2: Risiko', 0, 'videos/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222222/66666666-6666-6666-6666-666666666662/original.mp4', 1500, true),
  ('66666666-6666-6666-6666-666666666663', '22222222-2222-2222-2222-222222222223', null, 'Modul 3: Setups', 0, 'videos/11111111-1111-1111-1111-111111111111/22222222-2222-2222-2222-222222222223/66666666-6666-6666-6666-666666666663/original.mp4', 1800, true)
on conflict (id) do update
set title = excluded.title,
    position = excluded.position,
    storage_key = excluded.storage_key,
    duration_seconds = excluded.duration_seconds,
    is_published = excluded.is_published;

-- Demo Events
insert into events (id, title, description, start_time, end_time, event_type)
values
  ('33333333-3333-3333-3333-333333333331', 'Live Session: Wochenanalyse', 'Gemeinsame Marktanalyse am Abend.', now() + interval '2 day', now() + interval '2 day 2 hour', 'live_session'),
  ('33333333-3333-3333-3333-333333333332', 'Webinar: Journaling Framework', 'Sauberes Prozess-Journaling fuer Trader.', now() + interval '5 day', now() + interval '5 day 1 hour', 'webinar')
on conflict (id) do update
set title = excluded.title,
    description = excluded.description;

-- Demo Homework
insert into homework (id, title, description, due_date, week_number, is_active)
values
  ('44444444-4444-4444-4444-444444444441', 'Wochenaufgabe 1', 'Dokumentiere 5 valide Setups inkl. Invalidierung.', current_date + 7, 1, true)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    due_date = excluded.due_date;

-- Demo Quiz
insert into quizzes (id, module_id, title, pass_threshold, questions)
values (
  '55555555-5555-5555-5555-555555555551',
  '22222222-2222-2222-2222-222222222221',
  'Quiz Modul 1',
  100,
  '[
    {
      "id":"q1",
      "question":"Was ist im Trading zuerst zu definieren?",
      "options":["Gewinnziel","Invalidierung","Broker","Hebel"],
      "correct_index":1,
      "explanation":"Ohne klare Invalidierung gibt es kein kontrollierbares Risiko."
    },
    {
      "id":"q2",
      "question":"Was ist das Ziel eines Trading-Journals?",
      "options":["Mehr Trades","Mehr Screenshots","Messbare Prozessqualitaet","Signalverkauf"],
      "correct_index":2,
      "explanation":"Das Journal misst Entscheidungsguete, nicht nur PnL."
    }
  ]'::jsonb
)
on conflict (id) do update
set title = excluded.title,
    pass_threshold = excluded.pass_threshold,
    questions = excluded.questions;
