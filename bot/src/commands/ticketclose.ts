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
  console.log(
    `🧭 /ticketclose received guild=${interaction.guildId ?? "none"} channel=${interaction.channelId ?? "none"} user=${interaction.user.id}`
  );

  await interaction.deferReply({ ephemeral: true });

  const channel = interaction.channel as TextChannel | null;
  if (!channel || !interaction.guild) {
    await interaction.editReply({ content: "❌ Commande utilisable uniquement dans un serveur." });
    return;
  }

  // Vérifier que ce channel est bien un ticket ouvert
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id, user_id")
    .eq("channel_id", channel.id)
    .eq("status", "open")
    .maybeSingle();

  if (error) {
    console.error("ticketclose tickets lookup:", error);
    await interaction.editReply({ content: "❌ Impossible de vérifier ce ticket pour le moment." });
    return;
  }

  if (!ticket) {
    await interaction.editReply({ content: "❌ Ce salon n'est pas un ticket ouvert." });
    return;
  }

  // Vérifier les permissions : staff ou propriétaire du ticket
  const member = interaction.guild.members.cache.get(interaction.user.id)
    ?? await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
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

  await interaction.editReply({
    content: "⚠️ Es-tu sûr de vouloir fermer ce ticket ?",
    components: [row],
  });
}
