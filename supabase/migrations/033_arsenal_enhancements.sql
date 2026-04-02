-- Featured highlight + optional logo background for arsenal cards
alter table arsenal_cards add column if not exists is_featured boolean not null default false;
alter table arsenal_cards add column if not exists logo_bg text not null default 'transparent';

comment on column arsenal_cards.is_featured is 'Admin: highlight card on member Arsenal pages';
comment on column arsenal_cards.logo_bg is 'Logo area background: transparent | white | dark';

alter table arsenal_cards drop constraint if exists arsenal_cards_logo_bg_check;
alter table arsenal_cards add constraint arsenal_cards_logo_bg_check check (logo_bg in ('transparent', 'white', 'dark'));

create index if not exists idx_arsenal_cards_category_featured on arsenal_cards (category, is_featured desc);
