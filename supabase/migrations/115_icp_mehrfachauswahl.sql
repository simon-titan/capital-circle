-- 115 · ICP-Frage 3 („Was hält dich aktuell am meisten zurück?") mit Mehrfachauswahl
--       (Feedback Simon 14.11.2026)
--
-- `main_problem` bleibt die eine Hauptantwort (die zuerst gewählte) — darauf
-- laufen Auswertung und Kreuztabelle „Problem × Ziel" in `/admin/icp`.
-- Alle gewählten Antworten stehen zusätzlich in `main_problem_alle`, in der
-- Reihenfolge, in der sie angetippt wurden. Ohne diese Migration speichert die
-- App nur die erste Antwort (die Route fängt die fehlende Spalte ab).

alter table public.onboarding_antworten
  add column if not exists main_problem_alle text[]
    check (
      main_problem_alle is null
      or main_problem_alle <@ array['prozess', 'bias', 'execution', 'disziplin', 'risk', 'psychologie', 'konstanz', 'unklar']::text[]
    );

-- Bestand: die bisherige Einzelantwort als Liste übernehmen.
update public.onboarding_antworten
  set main_problem_alle = array[main_problem]
  where main_problem is not null and main_problem_alle is null;
