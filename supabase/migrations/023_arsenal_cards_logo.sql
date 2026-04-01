-- Arsenal cards: optional logo image (Hetzner storage key, typically covers/...)
alter table arsenal_cards
  add column if not exists logo_storage_key text;
