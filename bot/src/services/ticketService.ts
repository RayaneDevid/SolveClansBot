import {
  ChannelType,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  AttachmentBuilder,
  type Client,
  type Guild,
  type GuildMember,
  type TextChannel,
} from "discord.js";
import { supabase } from "../supabase.js";
import { buildTicketEmbed } from "./embedBuilder.js";
import { slugify, extractEmojiName } from "../utils/helpers.js";
import type { ClanOption, BotConfig } from "../types.js";

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
      id: guild.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
      ],
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
            PermissionFlagsBits.ManageChannels,
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

/**
 * Logique complète de fermeture : log transcript + fermeture BDD + suppression channel.
 * Utilisée aussi bien par le bouton que par la commande /ticketclose.
 */
export async function performTicketClose(
  channel: TextChannel,
  closedById: string,
  guild: { id: string; channels: { cache: Map<string, unknown> } }
): Promise<void> {
  // Récupérer les infos du ticket
  const { data: ticket } = await supabase
    .from("tickets")
    .select("*, clan_options(label)")
    .eq("channel_id", channel.id)
    .single();

  // Récupérer la config pour le salon de logs
  const { data: config } = await supabase
    .from("bot_config")
    .select("*")
    .eq("guild_id", guild.id)
    .single<BotConfig>();

  // Envoyer le transcript dans le salon de logs
  if (config?.log_channel_id) {
    const logChannel = guild.channels.cache.get(config.log_channel_id);
    if (logChannel && "send" in (logChannel as object)) {
      try {
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
          .setDescription(`✅ Ticket **${channel.name}** fermé par <@${closedById}>`)
          .addFields(
            { name: "De", value: ticket?.user_id ? `<@${ticket.user_id}>` : "N/A", inline: true },
            { name: "Raison", value: clanLabel, inline: true },
            { name: "Fermé par", value: `<@${closedById}>`, inline: true }
          )
          .setFooter({ text: "Solve · Clans | Tickets" })
          .setTimestamp();

        await (logChannel as { send: Function }).send({ files: [attachment], embeds: [closeEmbed] });
      } catch (err) {
        console.error("❌ Erreur lors de l'envoi du log :", err);
      }
    }
  }

  await closeTicket(channel.id, closedById);

  setTimeout(async () => {
    try {
      await channel.delete("Ticket fermé");
    } catch {
      // Channel peut déjà avoir été supprimé
    }
  }, 5000);
}

export async function ensureBotAccessToOpenTickets(client: Client<true>): Promise<void> {
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("channel_id, guild_id")
    .eq("status", "open");

  if (error) {
    console.error("❌ Impossible de récupérer les tickets ouverts pour sync bot perms :", error.message);
    return;
  }

  if (!tickets?.length) return;

  let updated = 0;
  let skipped = 0;

  for (const ticket of tickets) {
    try {
      if (!client.guilds.cache.has(ticket.guild_id)) {
        skipped++;
        continue;
      }

      const channel = await client.channels.fetch(ticket.channel_id);
      if (!channel || channel.type !== ChannelType.GuildText) {
        skipped++;
        continue;
      }

      await channel.permissionOverwrites.edit(client.user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        ManageMessages: true,
        ManageChannels: true,
        EmbedLinks: true,
        AttachFiles: true,
      });
      updated++;
    } catch (err) {
      console.error(`❌ Impossible de sync les permissions bot pour ${ticket.channel_id} :`, err);
      skipped++;
    }
  }

  console.log(`🔧 Permissions bot synchronisées sur ${updated} ticket(s) ouvert(s). ${skipped} ignoré(s).`);
}
