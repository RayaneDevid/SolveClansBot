-- Activer REPLICA IDENTITY FULL pour que Supabase Realtime envoie old/new values
ALTER TABLE bot_config REPLICA IDENTITY FULL;
ALTER TABLE clan_options REPLICA IDENTITY FULL;

-- Ajouter les tables à la publication Realtime de Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE bot_config;
ALTER PUBLICATION supabase_realtime ADD TABLE clan_options;
