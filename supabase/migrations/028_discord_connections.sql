-- Discord OAuth Verknüpfungen (eine Zeile pro Plattform-User)
CREATE TABLE IF NOT EXISTS discord_connections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  discord_user_id text NOT NULL,
  discord_username text,
  discord_access_token text,
  discord_refresh_token text,
  connected_at timestamptz DEFAULT now(),
  CONSTRAINT discord_connections_user_id_key UNIQUE (user_id),
  CONSTRAINT discord_connections_discord_user_id_key UNIQUE (discord_user_id)
);

CREATE INDEX IF NOT EXISTS discord_connections_user_id_idx ON discord_connections (user_id);

ALTER TABLE discord_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User sieht nur eigene Verbindung"
  ON discord_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "User kann eigene Verbindung einfügen"
  ON discord_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User kann eigene Verbindung updaten"
  ON discord_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "User kann eigene Verbindung löschen"
  ON discord_connections FOR DELETE
  USING (auth.uid() = user_id);
