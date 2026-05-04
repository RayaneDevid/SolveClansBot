import {
  type ButtonInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type TextChannel,
} from "discord.js";
import { performTicketClose } from "../services/ticketService.js";
import { supabase } from "../supabase.js";
import { getConfiguredStaffRoleIds, memberHasAnyRole } from "../utils/staffRoles.js";

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
  // Defer immediately to avoid the 3-second Discord window expiring (10062)
  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.channel as TextChannel | null;
  if (!channel || !interaction.guild) {
    await interaction.editReply({ content: "❌ Erreur : ticket introuvable." });
    return;
  }

  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id, user_id")
    .eq("channel_id", channel.id)
    .eq("status", "open")
    .maybeSingle();

  if (error) {
    console.error("close_ticket tickets lookup:", error);
    await interaction.editReply({ content: "❌ Impossible de vérifier ce ticket pour le moment." });
    return;
  }

  if (!ticket) {
    await interaction.editReply({ content: "❌ Ce salon n'est pas un ticket ouvert." });
    return;
  }

  const member = interaction.guild?.members.cache.get(interaction.user.id)
    ?? await interaction.guild?.members.fetch(interaction.user.id).catch(() => null);

  const hasManageChannels = member?.permissions.has(PermissionFlagsBits.ManageChannels);
  const hasManageMessages = member?.permissions.has(PermissionFlagsBits.ManageMessages);
  const isOwner = ticket.user_id === interaction.user.id;
  const staffRoleIds = await getConfiguredStaffRoleIds(interaction.guild.id);
  const hasStaffRole = member ? memberHasAnyRole(member, staffRoleIds) : false;

  if (!hasManageChannels && !hasManageMessages && !hasStaffRole && !isOwner) {
    await interaction.editReply({
      content: "❌ Seul le staff ou le propriétaire du ticket peut le fermer.",
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

  await interaction.editReply({
    content: "⚠️ Es-tu sûr de vouloir fermer ce ticket ?",
    components: [row],
  });
}

async function handleConfirmClose(interaction: ButtonInteraction): Promise<void> {
  await interaction.deferUpdate();
  await interaction.editReply({ content: "🔒 Fermeture en cours...", components: [] });

  const channel = interaction.channel as TextChannel | null;
  if (!channel || !("guild" in channel) || !channel.guild) {
    await interaction.editReply({ content: "❌ Erreur : channel introuvable." });
    return;
  }

  try {
    await performTicketClose(channel, interaction.user.id, interaction.guild!);
  } catch (err) {
    console.error("confirm_close_ticket:", err);
    await interaction.editReply({
      content: "❌ Une erreur est survenue pendant la fermeture du ticket.",
    });
    return;
  }

  await interaction.editReply({
    content: "🔒 Ticket fermé. Ce channel va être supprimé dans 5 secondes...",
  });
}
