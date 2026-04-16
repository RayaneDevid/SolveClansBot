import {
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
  type APISelectMenuOption,
} from "discord.js";
import type { ClanOption, BotConfig } from "../types.js";

export function buildMainEmbed(
  config: BotConfig,
  options: ClanOption[]
): { embeds: EmbedBuilder[]; rows: ActionRowBuilder<StringSelectMenuBuilder>[] } {
  const color = parseInt((config.embed_color ?? "#7C3AED").replace("#", ""), 16);

  const embeds: EmbedBuilder[] = [];

  // Bannière en premier embed (trick pour afficher l'image en haut)
  if (config.banner_url) {
    embeds.push(new EmbedBuilder().setColor(color).setImage(config.banner_url));
  }

  const mainEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle(config.embed_title ?? "Ouvrir un ticket clan")
    .setDescription(
      [
        "**Fonctionnement des tickets**",
        "",
        "1️⃣ Sélectionnez votre clan dans le menu ci-dessous",
        "2️⃣ Renseignez votre Nom et Prénom RP dans la fenêtre prévue à cet effet",
        "",
        "**Règles de courtoisie**",
        "",
        "• Merci de rester poli et respectueux (Bonjour, Merci...)",
        "• Toute forme de harcèlement est interdite.",
        "",
        "**Sélection du ticket**",
        "ℹ️ Choisissez votre clan dans le menu ci-dessous",
      ].join("\n")
    )
    .setFooter({
      text: `Solve · Clans | ${new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })}`,
    });

  embeds.push(mainEmbed);

  const enabledOptions: APISelectMenuOption[] = options
    .filter((o) => o.enabled)
    .map((o) => {
      const opt: APISelectMenuOption = {
        label: o.label,
        value: o.id,
      };
      if (o.description) opt.description = o.description;
      if (o.emoji) {
        const customMatch = o.emoji.match(/<:(\w+):(\d+)>/);
        if (customMatch) {
          opt.emoji = { name: customMatch[1], id: customMatch[2] };
        } else {
          opt.emoji = { name: o.emoji };
        }
      }
      return opt;
    });

  // Discord : max 25 options par select, max 5 action rows par message
  const CHUNK_SIZE = 25;
  const MAX_SELECTS = 5;
  const chunks: APISelectMenuOption[][] = [];
  for (let i = 0; i < enabledOptions.length && chunks.length < MAX_SELECTS; i += CHUNK_SIZE) {
    chunks.push(enabledOptions.slice(i, i + CHUNK_SIZE));
  }

  const rows = chunks.map((chunk, index) => {
    const placeholder = chunks.length === 1
      ? "🔽 Choisissez votre clan..."
      : `🔽 Clans ${index * CHUNK_SIZE + 1}–${index * CHUNK_SIZE + chunk.length}`;

    const select = new StringSelectMenuBuilder()
      .setCustomId(`clan_select_${index}`)
      .setPlaceholder(placeholder)
      .addOptions(chunk);

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
  });

  return { embeds, rows };
}

export function buildTicketEmbed(
  clanLabel: string,
  clanEmoji: string | null,
  firstName: string,
  lastName: string,
  userTag: string
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle(`${clanEmoji ? clanEmoji + " " : ""}Ticket — ${clanLabel}`)
    .addFields(
      { name: "Joueur", value: `<@${userTag}>`, inline: true },
      { name: "Prénom RP", value: firstName, inline: true },
      { name: "Nom RP", value: lastName, inline: true },
      { name: "Clan", value: clanLabel, inline: true }
    )
    .setFooter({
      text: `Ouvert le ${new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
    });
}
