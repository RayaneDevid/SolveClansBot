import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ChannelType,
} from "discord.js";
import { supabase } from "../supabase.js";

export const data = new SlashCommandBuilder()
  .setName("sync-perms")
  .setDescription("Synchronise les permissions staff et bot sur tous les tickets ouverts");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply({ content: "❌ Commande utilisable uniquement dans un serveur." });
    return;
  }

  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("channel_id, clan_option_id")
    .eq("guild_id", guild.id)
    .eq("status", "open");

  if (error || !tickets?.length) {
    await interaction.editReply({ content: "ℹ️ Aucun ticket ouvert trouvé." });
    return;
  }

  // Récupérer tous les staff_role_id des clans concernés
  const clanOptionIds = [...new Set(tickets.map((t) => t.clan_option_id).filter(Boolean))];
  const { data: clanOptions } = await supabase
    .from("clan_options")
    .select("id, staff_role_id")
    .in("id", clanOptionIds);

  const roleByOption = new Map<string, string>(
    (clanOptions ?? [])
      .filter((o) => o.staff_role_id)
      .map((o) => [o.id, o.staff_role_id as string])
  );

  let updated = 0;
  let skipped = 0;
  const botId = interaction.client.user.id;

  for (const ticket of tickets) {
    const staffRoleId = roleByOption.get(ticket.clan_option_id);

    try {
      const channel = await guild.channels.fetch(ticket.channel_id);
      if (!channel || channel.type !== ChannelType.GuildText) { skipped++; continue; }

      await channel.permissionOverwrites.edit(botId, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        ManageMessages: true,
        ManageChannels: true,
        EmbedLinks: true,
        AttachFiles: true,
        UseApplicationCommands: true,
      });

      if (staffRoleId) {
        await channel.permissionOverwrites.edit(staffRoleId, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          ManageMessages: true,
          ManageChannels: true,
          UseApplicationCommands: true,
        });
      }

      updated++;
    } catch {
      skipped++;
    }
  }

  await interaction.editReply({
    content: `✅ Permissions mises à jour sur **${updated}** ticket(s). ${skipped > 0 ? `⚠️ ${skipped} ignoré(s) (channel introuvable ou pas de rôle staff).` : ""}`,
  });
}
