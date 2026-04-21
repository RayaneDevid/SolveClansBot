import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { supabase } from "../supabase.js";
import { buildMainEmbed } from "../services/embedBuilder.js";
import type { ClanOption, BotConfig } from "../types.js";

export const data = new SlashCommandBuilder()
  .setName("setup-clans")
  .setDescription("Envoie ou met à jour l'embed de sélection de clan dans ce salon");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  if (!guild) {
    await interaction.editReply({ content: "❌ Commande utilisable uniquement dans un serveur." });
    return;
  }

  // Récupérer la config et les options
  const [configResult, optionsResult] = await Promise.all([
    supabase.from("bot_config").select("*").eq("guild_id", guild.id).single<BotConfig>(),
    supabase
      .from("clan_options")
      .select("*")
      .eq("guild_id", guild.id)
      .eq("enabled", true)
      .order("sort_order", { ascending: true }),
  ]);

  const botConfig = configResult.data;
  const options: ClanOption[] = (optionsResult.data ?? []) as ClanOption[];

  if (!options.length) {
    await interaction.editReply({
      content: "❌ Aucune option de clan configurée. Ajoutez des clans depuis le panel web.",
    });
    return;
  }

  const { embeds, rows } = buildMainEmbed(botConfig ?? {
    id: "",
    guild_id: guild.id,
    channel_id: null,
    message_id: null,
    embed_title: "Ouvrir un ticket clan",
    embed_color: "#7C3AED",
    banner_url: null,
    log_channel_id: null,
    staff_role_ids: [],
    created_at: "",
    updated_at: "",
  }, options);

  const channel = interaction.channel;
  if (!channel || !("send" in channel)) {
    await interaction.editReply({ content: "❌ Ce salon n'est pas supporté." });
    return;
  }

  // Si un message_id existe, essayer de le modifier
  if (botConfig?.message_id) {
    try {
      const existing = await channel.messages.fetch(botConfig.message_id);
      await existing.edit({ embeds, components: rows });
      await interaction.editReply({ content: "✅ Embed mis à jour !" });
      return;
    } catch {
      // Message supprimé ou introuvable, on en crée un nouveau
    }
  }

  const message = await channel.send({ embeds, components: rows });

  // Sauvegarder en BDD
  await supabase.from("bot_config").upsert(
    {
      guild_id: guild.id,
      channel_id: channel.id,
      message_id: message.id,
    },
    { onConflict: "guild_id" }
  );

  await interaction.editReply({ content: "✅ Embed envoyé !" });
}
