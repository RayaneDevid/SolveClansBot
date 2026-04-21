export interface ClanOption {
  id: string;
  guild_id: string;
  label: string;
  emoji: string | null;
  description: string | null;
  category_id: string;
  staff_role_id: string | null;
  sort_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface BotConfig {
  id: string;
  guild_id: string;
  channel_id: string | null;
  message_id: string | null;
  embed_title: string | null;
  embed_color: string | null;
  banner_url: string | null;
  log_channel_id: string | null;
  staff_role_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  guild_id: string;
  channel_id: string;
  user_id: string;
  clan_option_id: string;
  rp_first_name: string;
  rp_last_name: string;
  status: "open" | "closed";
  opened_at: string;
  closed_at: string | null;
  closed_by: string | null;
}
