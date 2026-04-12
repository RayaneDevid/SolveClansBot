-- Table des administrateurs autorisés
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_id TEXT NOT NULL UNIQUE,
  discord_username TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Configuration du bot par guild
CREATE TABLE IF NOT EXISTS bot_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL UNIQUE,
  channel_id TEXT,
  message_id TEXT,
  embed_title TEXT DEFAULT 'Ouvrir un ticket clan',
  embed_color TEXT DEFAULT '#7C3AED',
  banner_url TEXT,
  log_channel_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Options du select menu (les clans)
CREATE TABLE IF NOT EXISTS clan_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  label TEXT NOT NULL,
  emoji TEXT,
  description TEXT,
  category_id TEXT NOT NULL,
  staff_role_id TEXT,
  sort_order INT DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tickets ouverts (tracking)
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  clan_option_id UUID REFERENCES clan_options(id),
  rp_first_name TEXT NOT NULL,
  rp_last_name TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ,
  closed_by TEXT
);

-- RLS
ALTER TABLE bot_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Policies admins : lecture publique (on vérifie juste si un discord_id est admin)
CREATE POLICY "admins_select_public" ON admins
  FOR SELECT USING (true);

-- Policies bot_config : accès service_role uniquement (via bot) + lecture authentifiée
CREATE POLICY "bot_config_select_authenticated" ON bot_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "bot_config_insert_authenticated" ON bot_config
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "bot_config_update_authenticated" ON bot_config
  FOR UPDATE TO authenticated USING (true);

-- Policies clan_options : lecture publique, écriture authentifiée
CREATE POLICY "clan_options_select_public" ON clan_options
  FOR SELECT USING (true);

CREATE POLICY "clan_options_insert_authenticated" ON clan_options
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "clan_options_update_authenticated" ON clan_options
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "clan_options_delete_authenticated" ON clan_options
  FOR DELETE TO authenticated USING (true);

-- Policies tickets : lecture authentifiée
CREATE POLICY "tickets_select_authenticated" ON tickets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "tickets_insert_authenticated" ON tickets
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "tickets_update_authenticated" ON tickets
  FOR UPDATE TO authenticated USING (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bot_config_updated_at
  BEFORE UPDATE ON bot_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER clan_options_updated_at
  BEFORE UPDATE ON clan_options
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
