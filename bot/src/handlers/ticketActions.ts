import {
  type ButtonInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  AttachmentBuilder,
  type TextChannel,
} from "discord.js";
import { closeTicket } from "../services/ticketService.js";
import { supabase } from "../supabase.js";
import type { BotConfig } from "../types.js";

export async function handleTicketActions(
  interaction: ButtonInteraction
): Promise<void> {
  if (interaction.customId !== "close_ticket") return;

  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.channel as TextChannel | null;
  if (!channel || !("guild" in channel) || !channel.guild) {
    await interaction.editReply({ content: "❌ Erreur : channel introuvable." });
    return;
  }

  const member = interaction.guild?.members.cache.get(interaction.user.id);
  const hasManageChannels = member?.permissions.has(PermissionFlagsBits.ManageChannels);
  const hasManageMessages = member?.permissions.has(PermissionFlagsBits.ManageMessages);

  if (!hasManageChannels && !hasManageMessages) {
    await interaction.editReply({
      content: "❌ Seul le staff peut fermer les tickets.",
    });
    return;
  }

  // Récupérer les infos du ticket avant de fermer
  const { data: ticket } = await supabase
    .from("tickets")
    .select("*, clan_options(label)")
    .eq("channel_id", channel.id)
    .single();

  // Récupérer la config pour le salon de logs
  const { data: config } = await supabase
    .from("bot_config")
    .select("*")
    .eq("guild_id", interaction.guild!.id)
    .single<BotConfig>();

  // Générer le transcript avant suppression
  if (config?.log_channel_id) {
    const logChannel = interaction.guild?.channels.cache.get(config.log_channel_id);
    if (logChannel && "send" in logChannel) {
      try {
        // Récupérer les messages (max 100)
        const fetched = await channel.messages.fetch({ limit: 100 });
        const sorted = [...fetched.values()].reverse();

        const logLines = sorted.map((msg) => {
          const date = msg.createdAt.toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          const content = msg.content || (msg.embeds.length ? "[embed]" : "[attachment]");
          return `[${date}] ${msg.author.username}: ${content}`;
        });

        const logBuffer = Buffer.from(logLines.join("\n"), "utf-8");
        const attachment = new AttachmentBuilder(logBuffer, {
          name: `${channel.name}.log`,
        });

        const clanLabel = (ticket?.clan_options as { label: string } | null)?.label ?? "N/A";

        const closeEmbed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setDescription(`✅ Ticket **${channel.name}** fermé par <@${interaction.user.id}>`)
          .addFields(
            {
              name: "De",
              value: ticket?.user_id ? `<@${ticket.user_id}>` : "N/A",
              inline: true,
            },
            { name: "Raison", value: clanLabel, inline: true },
            {
              name: "Pris en charge par",
              value: `<@${interaction.user.id}>`,
              inline: true,
            }
          )
          .setFooter({ text: "Solve · Clans | Tickets" })
          .setTimestamp();

        await logChannel.send({ files: [attachment], embeds: [closeEmbed] });
      } catch (err) {
        console.error("❌ Erreur lors de l'envoi du log :", err);
      }
    }
  }

  await closeTicket(channel.id, interaction.user.id);

  await interaction.editReply({
    content: "🔒 Ticket fermé. Ce channel va être supprimé dans 5 secondes...",
  });

  setTimeout(async () => {
    try {
      await channel.delete("Ticket fermé");
    } catch {
      // Channel peut déjà avoir été supprimé
    }
  }, 5000);
}
