import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  type TextChannel,
} from "discord.js";
import { supabase } from "../supabase.js";
import { getConfiguredStaffRoleIds, memberHasAnyRole } from "../utils/staffRoles.js";

export const data = new SlashCommandBuilder()
  .setName("ticketadd")
  .setDescription("Ajoute un joueur au ticket dans lequel vous êtes")
  .addUserOption((option) =>
    option
      .setName("joueur")
      .setDescription("Le joueur à ajouter au ticket")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel = interaction.channel as TextChannel | null;
  if (!channel || !interaction.guild) {
    await interaction.reply({ content: "❌ Commande utilisable uniquement dans un serveur.", ephemeral: true });
    return;
  }

  // Vérifier que ce channel est bien un ticket ouvert
  const { data: ticket } = await supabase
    .from("tickets")
    .select("id")
    .eq("channel_id", channel.id)
    .eq("status", "open")
    .single();

  if (!ticket) {
    await interaction.reply({ content: "❌ Ce salon n'est pas un ticket ouvert.", ephemeral: true });
    return;
  }

  // Seul le staff peut ajouter quelqu'un
  const member = interaction.guild.members.cache.get(interaction.user.id);
  const hasManageChannels = member?.permissions.has(PermissionFlagsBits.ManageChannels);
  const hasManageMessages = member?.permissions.has(PermissionFlagsBits.ManageMessages);
  const staffRoleIds = await getConfiguredStaffRoleIds(interaction.guild.id);
  const hasStaffRole = member ? memberHasAnyRole(member, staffRoleIds) : false;

  if (!hasManageChannels && !hasManageMessages && !hasStaffRole) {
    await interaction.reply({
      content: "❌ Seul le staff peut ajouter des joueurs au ticket.",
      ephemeral: true,
    });
    return;
  }

  const targetUser = interaction.options.getUser("joueur", true);
  const targetMember = interaction.guild.members.cache.get(targetUser.id)
    ?? await interaction.guild.members.fetch(targetUser.id).catch(() => null);

  if (!targetMember) {
    await interaction.reply({ content: "❌ Ce joueur est introuvable sur le serveur.", ephemeral: true });
    return;
  }

  // Vérifier si le joueur a déjà accès
  const existingOverwrite = channel.permissionOverwrites.cache.get(targetUser.id);
  if (existingOverwrite?.allow.has(PermissionFlagsBits.ViewChannel)) {
    await interaction.reply({
      content: `❌ <@${targetUser.id}> a déjà accès à ce ticket.`,
      ephemeral: true,
    });
    return;
  }

  // Ajouter les permissions
  await channel.permissionOverwrites.create(targetMember, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
  });

  await interaction.reply({
    content: `✅ <@${targetUser.id}> a été ajouté au ticket.`,
  });
}
