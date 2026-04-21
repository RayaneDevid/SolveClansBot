import type { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { supabase } from "../supabase.js";
import type { BotConfig } from "../types.js";

const STAFF_COMMANDS = new Set([
  "setup-clans",
  "sync-perms",
  "clone-forum",
  "create-clan-salon",
]);

function memberHasAnyRole(member: GuildMember, roleIds: string[]): boolean {
  if (!roleIds.length) return false;
  return roleIds.some((id) => member.roles.cache.has(id));
}

export async function isAuthorizedForCommand(
  interaction: ChatInputCommandInteraction
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!interaction.guild) return { ok: false, reason: "❌ Commande utilisable uniquement dans un serveur." };

  if (!STAFF_COMMANDS.has(interaction.commandName)) return { ok: true };

  const member = interaction.member;
  if (!member || !("permissions" in member)) {
    return { ok: false, reason: "❌ Impossible de vérifier tes permissions." };
  }

  const guildMember = member as GuildMember;

  // Toujours autoriser les admins serveur / ManageGuild (fallback sécurité)
  if (guildMember.permissions.has(PermissionFlagsBits.Administrator)) return { ok: true };
  if (guildMember.permissions.has(PermissionFlagsBits.ManageGuild)) return { ok: true };

  const { data: config, error } = await supabase
    .from("bot_config")
    .select("staff_role_ids")
    .eq("guild_id", interaction.guild.id)
    .single<Pick<BotConfig, "staff_role_ids">>();

  if (error && error.code !== "PGRST116") {
    console.error("commandAuth bot_config:", error);
  }

  const staffRoleIds = (config?.staff_role_ids ?? []).filter(Boolean);

  if (memberHasAnyRole(guildMember, staffRoleIds)) return { ok: true };

  return {
    ok: false,
    reason:
      "❌ Tu n'as pas les permissions pour cette commande. " +
      "Ajoute ton rôle staff dans le panel (Paramètres → Rôles staff commandes).",
  };
}

