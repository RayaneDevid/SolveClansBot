-- Ajout d'un champ pour suivre les rappels d'inactivité
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ DEFAULT NULL;
