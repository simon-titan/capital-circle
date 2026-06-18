-- Discord-Funnel: OAuth-Join mit fester Rollen-Zuweisung.
-- Speichert die Discord-User-Identität des beigetretenen Leads, damit die
-- feste Funnel-Rolle (DISCORD_FUNNEL_ROLE_ID) zugewiesen und der Join exakt
-- pro Lead getrackt werden kann.

alter table discord_leads
  add column if not exists discord_user_id text,
  add column if not exists discord_username text;

create index if not exists discord_leads_discord_user_id_idx
  on discord_leads (discord_user_id);
