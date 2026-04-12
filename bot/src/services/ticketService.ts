import {
  ChannelType,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  type Guild,
  type GuildMember,
} from "discord.js";
import { supabase } from "../supabase.js";
import { buildTicketEmbed } from "./embedBuilder.js";
import { slugify, extractEmojiName } from "../utils/helpers.js";
import type { ClanOption } from "../types.js";

export async function createTicket(
  guild: Guild,
  member: GuildMember,
  clanOption: ClanOption,
  firstName: string,
  lastName: string
): Promise<{ channelId: string }> {
  // Vérifier si l'utilisateur a déjà un ticket ouvert
  const { data: existingTicket } = await supabase
    .from("tickets")
    .select("id, channel_id")
    .eq("guild_id", guild.id)
    .eq("user_id", member.id)
    .eq("status", "open")
    .single();

  if (existingTicket) {
    throw new Error(`ticket_exists:${existingTicket.channel_id}`);
  }

  // Construire le nom du channel
  const emojiName = extractEmojiName(clanOption.emoji);
  const channelName = slugify(
    `${emojiName ? emojiName + "-" : ""}${firstName}-${lastName}`
  );

  // Permissions du channel
  const baseOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    },
  ];

  const permissionOverwrites = clanOption.staff_role_id
    ? [
        ...baseOverwrites,
        {
          id: clanOption.staff_role_id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
          ],
        },
      ]
    : baseOverwrites;

  // Créer le channel
  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: clanOption.category_id,
    permissionOverwrites,
  });

  // Envoyer l'embed d'accueil
  const welcomeEmbed = buildTicketEmbed(
    clanOption.label,
    clanOption.emoji,
    firstName,
    lastName,
    member.id
  );

  const closeButton = new ButtonBuilder()
    .setCustomId("close_ticket")
    .setLabel("🔒 Fermer le ticket")
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton);

  const mentionParts: string[] = [`<@${member.id}>`];
  if (clanOption.staff_role_id) {
    mentionParts.push(`<@&${clanOption.staff_role_id}>`);
  }

  await channel.send({
    content: mentionParts.join(" "),
    embeds: [welcomeEmbed],
    components: [row],
  });

  // Sauvegarder en BDD
  const { error } = await supabase.from("tickets").insert({
    guild_id: guild.id,
    channel_id: channel.id,
    user_id: member.id,
    clan_option_id: clanOption.id,
    rp_first_name: firstName,
    rp_last_name: lastName,
  });

  if (error) {
    console.error("Error saving ticket to DB:", error);
  }

  return { channelId: channel.id };
}

export async function closeTicket(
  channelId: string,
  closedBy: string
): Promise<void> {
  await supabase
    .from("tickets")
    .update({ status: "closed", closed_at: new Date().toISOString(), closed_by: closedBy })
    .eq("channel_id", channelId);
}
