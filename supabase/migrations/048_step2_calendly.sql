-- Step-2-Bewerbung: Calendly-Terminzuordnung
-- Drei Spalten für die Verknüpfung zwischen Step-2-Bewerbung und Calendly-Buchung.

alter table public.step2_applications
  add column if not exists calendly_event_uri text,
  add column if not exists calendly_invitee_uri text,
  add column if not exists calendly_booked_at timestamptz;
