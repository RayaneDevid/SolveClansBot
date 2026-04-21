import type { GuildMember } from "discord.js";
import { supabase } from "../supabase.js";
import type { BotConfig } from "../types.js";

export async function getConfiguredStaffRoleIds(guildId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("bot_config")
    .select("staff_role_ids")
    .eq("guild_id", guildId)
    .single<Pick<BotConfig, "staff_role_ids">>();

  if (error && error.code !== "PGRST116") {
    console.error("staffRoles bot_config:", error);
  }

  return (data?.staff_role_ids ?? []).filter(Boolean);
}

export function memberHasAnyRole(member: GuildMember, roleIds: string[]): boolean {
  if (!roleIds.length) return false;
  return roleIds.some((id) => member.roles.cache.has(id));
}

