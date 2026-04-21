-- Allow configuring staff roles that can use bot commands
ALTER TABLE bot_config
ADD COLUMN IF NOT EXISTS staff_role_ids TEXT[] NOT NULL DEFAULT '{}';

