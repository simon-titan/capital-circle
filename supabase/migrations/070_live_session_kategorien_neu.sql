-- Live Sessions neu aufsetzen + PDF-Bestand nachziehen (17.09.2026)
--
-- Zwei Themen in einer Datei, weil beide aus demselben Feedback stammen und
-- zusammen eingespielt werden sollen.
--
-- Teil 1 — Live Sessions leeren und auf drei Kategorien bringen:
--   Der bisherige Bestand (Live-Trading / Q&A / Weekly Outlook samt aller
--   Aufzeichnungen) wird komplett verworfen. Die Videos lagen auf dem toten
--   Hetzner-Speicher, die Eintraege zeigen also ohnehin ins Leere. Danach gibt
--   es genau drei Kategorien: Live Trading, Backtesting, Wochenrecap.
--
-- Teil 2 — Bestandsnachtrag fuer die PDF-Ansicht:
--   Ueber eine Institut-Lektion hochgeladene PDFs bekamen bisher kein
--   `arsenal_kind` (der Uploader schickte das Feld nicht mit) und tauchten
--   deshalb nie unter /arsenal/pdfs auf. Der Uploader sendet es ab sofort;
--   diese Migration holt den Bestand nach.
--
-- ACHTUNG: Teil 1 loescht Daten und ist nicht rueckgaengig zu machen. Genau so
-- gewollt (Feedback vom 17.09.2026) — vorher pruefen, ob wirklich nichts
-- Erhaltenswertes in `live_sessions` steht.
--
-- Wiederholbar: die deletes sind idempotent, die inserts pruefen auf den Titel.

-- ── Teil 1: Live Sessions ───────────────────────────────────────────────────

-- Reihenfolge entlang der Fremdschluessel: Videos, Sub-Abschnitte, Sessions,
-- Kategorien. `live_sessions.category_id` haengt an `on delete restrict`, die
-- Kategorien koennen also erst ganz zum Schluss weg.
delete from live_session_videos;
delete from live_session_subcategories;
delete from live_sessions;
delete from live_session_categories;

insert into live_session_categories (title, position)
select v.title, v.position
from (values
  ('Live Trading', 1),
  ('Backtesting', 2),
  ('Wochenrecap', 3)
) as v(title, position)
where not exists (
  select 1 from live_session_categories c where c.title = v.title
);

-- ── Teil 2: PDF-Anhaenge aus Lektionen ──────────────────────────────────────

-- Nur dort setzen, wo bisher gar nichts stand: ein bewusst auf 'template'
-- gesetztes PDF bleibt, was es ist. Die Dateiendung zaehlt mit, weil
-- `content_type` bei aelteren Uploads leer sein kann.
update video_attachments
set arsenal_kind = 'pdf'
where arsenal_kind is null
  and (content_type = 'application/pdf' or lower(filename) like '%.pdf');

-- Alles uebrige aus Lektions-Uploads ist eine Vorlage — sonst bliebe es auch
-- nach dem Fix im Uploader unsichtbar, weil beide Arsenal-Listen auf
-- `arsenal_kind` filtern.
update video_attachments
set arsenal_kind = 'template'
where arsenal_kind is null;
