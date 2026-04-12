import { Client, GatewayIntentBits, Events, TextChannel } from "discord.js";
import { config } from "./config.js";
import { supabase } from "./supabase.js";
import { onReady } from "./events/ready.js";
import { onInteractionCreate } from "./events/interactionCreate.js";
import { buildMainEmbed } from "./services/embedBuilder.js";
import type { BotConfig, ClanOption } from "./types.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once(Events.ClientReady, async (readyClient) => {
  await onReady(readyClient);
});
client.on(Events.InteractionCreate, onInteractionCreate);

async function deployPendingEmbeds(): Promise<void> {
  const { data: pending, error } = await supabase
    .from("bot_config")
    .select("*")
    .not("channel_id", "is", null)
    .is("message_id", null);

  if (error) {
    console.error("❌ Erreur lors de la récupération des embeds en attente :", error.message);
    return;
  }

  if (!pending?.length) {
    console.log("✅ Aucun embed en attente de déploiement");
    return;
  }

  console.log(`🔄 ${pending.length} embed(s) en attente de déploiement...`);
  for (const cfg of pending) {
    await syncEmbed(cfg as BotConfig);
  }
}

async function syncEmbed(botConfig: BotConfig): Promise<void> {
  if (!botConfig?.channel_id) return;

  const { data: options } = await supabase
    .from("clan_options")
    .select("*")
    .eq("guild_id", botConfig.guild_id)
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  if (!options?.length) {
    console.log(`⚠️ Aucune option de clan pour le guild ${botConfig.guild_id}`);
    return;
  }

  let channel;
  try {
    channel = await client.channels.fetch(botConfig.channel_id);
  } catch {
    console.error(`❌ Channel introuvable : ${botConfig.channel_id}`);
    return;
  }

  if (!(channel instanceof TextChannel)) return;

  const { embeds, row } = buildMainEmbed(botConfig, options as ClanOption[]);

  // Essayer de modifier le message existant
  if (botConfig.message_id) {
    try {
      const message = await channel.messages.fetch(botConfig.message_id);
      await message.edit({ embeds, components: [row] });
      console.log(`✅ Embed mis à jour pour le guild ${botConfig.guild_id}`);
      return;
    } catch {
      console.log("⚠️ Message existant introuvable, envoi d'un nouveau message...");
    }
  }

  // Envoyer un nouveau message et sauvegarder son ID
  try {
    const message = await channel.send({ embeds, components: [row] });
    await supabase
      .from("bot_config")
      .update({ message_id: message.id })
      .eq("guild_id", botConfig.guild_id);
    console.log(`✅ Embed envoyé pour le guild ${botConfig.guild_id} (message_id: ${message.id})`);
  } catch (error) {
    console.error("❌ Échec de l'envoi de l'embed :", error);
  }
}

client.login(config.discordToken).catch((error) => {
  console.error("Failed to login:", error);
  process.exit(1);
});
