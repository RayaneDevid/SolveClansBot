import {
  type ButtonInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type TextChannel,
} from "discord.js";
import { performTicketClose } from "../services/ticketService.js";

export async function handleTicketActions(
  interaction: ButtonInteraction
): Promise<void> {
  const { customId } = interaction;

  if (customId === "close_ticket") {
    await handleCloseTicketButton(interaction);
  } else if (customId === "confirm_close_ticket") {
    await handleConfirmClose(interaction);
  } else if (customId === "cancel_close_ticket") {
    await interaction.update({ content: "❌ Fermeture annulée.", components: [] });
  }
}

async function handleCloseTicketButton(interaction: ButtonInteraction): Promise<void> {
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  const hasManageChannels = member?.permissions.has(PermissionFlagsBits.ManageChannels);
  const hasManageMessages = member?.permissions.has(PermissionFlagsBits.ManageMessages);

  if (!hasManageChannels && !hasManageMessages) {
    await interaction.reply({
      content: "❌ Seul le staff peut fermer les tickets.",
      ephemeral: true,
    });
    return;
  }

  // Demande de confirmation via boutons
  const confirmBtn = new ButtonBuilder()
    .setCustomId("confirm_close_ticket")
    .setLabel("✅ Confirmer la fermeture")
    .setStyle(ButtonStyle.Danger);

  const cancelBtn = new ButtonBuilder()
    .setCustomId("cancel_close_ticket")
    .setLabel("↩️ Annuler")
    .setStyle(ButtonStyle.Secondary);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmBtn, cancelBtn);

  await interaction.reply({
    content: "⚠️ Es-tu sûr de vouloir fermer ce ticket ?",
    components: [row],
    ephemeral: true,
  });
}

async function handleConfirmClose(interaction: ButtonInteraction): Promise<void> {
  await interaction.update({ content: "🔒 Fermeture en cours...", components: [] });

  const channel = interaction.channel as TextChannel | null;
  if (!channel || !("guild" in channel) || !channel.guild) {
    await interaction.editReply({ content: "❌ Erreur : channel introuvable." });
    return;
  }

  await performTicketClose(channel, interaction.user.id, interaction.guild!);

  await interaction.editReply({
    content: "🔒 Ticket fermé. Ce channel va être supprimé dans 5 secondes...",
  });
}
