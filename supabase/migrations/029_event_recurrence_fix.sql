-- Stellt sicher, dass die Recurrence-Spalten existieren (idempotent; falls 025 nicht auf Remote lief)
alter table events add column if not exists is_recurring boolean not null default false;
alter table events add column if not exists recurrence_end_date date;
alter table events add column if not exists recurrence_group_id uuid;

create index if not exists idx_events_recurrence_group on events (recurrence_group_id)
  where recurrence_group_id is not null;
