import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type TextChannel,
} from "discord.js";
import { supabase } from "../supabase.js";
import { getConfiguredStaffRoleIds, memberHasAnyRole } from "../utils/staffRoles.js";

export const data = new SlashCommandBuilder()
  .setName("ticketclose")
  .setDescription("Ferme le ticket dans lequel vous êtes");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel = interaction.channel as TextChannel | null;
  if (!channel || !interaction.guild) {
    await interaction.reply({ content: "❌ Commande utilisable uniquement dans un serveur.", ephemeral: true });
    return;
  }

  // Vérifier que ce channel est bien un ticket ouvert
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id, user_id")
    .eq("channel_id", channel.id)
    .eq("status", "open")
    .single();

  if (!ticket) {
    await interaction.reply({ content: "❌ Ce salon n'est pas un ticket ouvert.", ephemeral: true });
    return;
  }

  // Vérifier les permissions : staff ou propriétaire du ticket
  const member = interaction.guild.members.cache.get(interaction.user.id);
  const hasManageChannels = member?.permissions.has(PermissionFlagsBits.ManageChannels);
  const hasManageMessages = member?.permissions.has(PermissionFlagsBits.ManageMessages);
  const isOwner = ticket.user_id === interaction.user.id;
  const staffRoleIds = await getConfiguredStaffRoleIds(interaction.guild.id);
  const hasStaffRole = member ? memberHasAnyRole(member, staffRoleIds) : false;

  if (!hasManageChannels && !hasManageMessages && !hasStaffRole && !isOwner) {
    await interaction.reply({
      content: "❌ Seul le staff ou le propriétaire du ticket peut le fermer.",
      ephemeral: true,
    });
    return;
  }

  // Demande de confirmation
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
