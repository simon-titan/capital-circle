-- Manuelle Reihenfolge (Admin Drag & Drop) — zusätzlich zu position für Abwärtskompatibilität
alter table arsenal_cards add column if not exists sort_order int not null default 0;

update arsenal_cards set sort_order = position;

create index if not exists idx_arsenal_cards_category_sort on arsenal_cards (category, sort_order asc);
