import { Client, GatewayIntentBits, Events, TextChannel } from "discord.js";
import { config } from "./config.js";
import { supabase } from "./supabase.js";
import { onReady } from "./events/ready.js";
import { onInteractionCreate } from "./events/interactionCreate.js";
import { buildMainEmbed } from "./services/embedBuilder.js";
import { startReminderScheduler } from "./services/reminderService.js";
import type { BotConfig, ClanOption } from "./types.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once(Events.ClientReady, async (readyClient) => {
  await onReady(readyClient);
  startReminderScheduler(readyClient);
});
client.on(Events.InteractionCreate, onInteractionCreate);

async function syncAllEmbeds(): Promise<void> {
  const { data: configs, error } = await supabase
    .from("bot_config")
    .select("*")
    .not("channel_id", "is", null);

  if (error) {
    console.error("❌ Erreur lors de la récupération des configs :", error.message);
    return;
  }

  if (!configs?.length) {
    console.log("ℹ️ Aucune config à synchroniser au démarrage");
    return;
  }

  console.log(`🔄 Synchronisation de ${configs.length} embed(s) au démarrage...`);
  for (const cfg of configs) {
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

  const { embeds, rows } = buildMainEmbed(botConfig, options as ClanOption[]);

  // Essayer de modifier le message existant
  if (botConfig.message_id) {
    try {
      const message = await channel.messages.fetch(botConfig.message_id);
      await message.edit({ embeds, components: rows });
      console.log(`✅ Embed mis à jour pour le guild ${botConfig.guild_id}`);
      return;
    } catch {
      console.log("⚠️ Message existant introuvable, envoi d'un nouveau message...");
    }
  }

  // Envoyer un nouveau message et sauvegarder son ID
  try {
    const message = await channel.send({ embeds, components: rows });
    await supabase
      .from("bot_config")
      .update({ message_id: message.id })
      .eq("guild_id", botConfig.guild_id);
    console.log(`✅ Embed envoyé pour le guild ${botConfig.guild_id} (message_id: ${message.id})`);
  } catch (error) {
    console.error("❌ Échec de l'envoi de l'embed :", error);
  }
}

// Supabase Realtime — re-sync l'embed quand les options ou la config changent
function setupRealtimeSync(): void {
  supabase
    .channel("embed-sync")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "clan_options" },
      async (payload) => {
        const guildId =
          (payload.new as { guild_id?: string })?.guild_id ??
          (payload.old as { guild_id?: string })?.guild_id;

        if (!guildId) return;

        console.log(`🔄 clan_options changed for guild ${guildId}, syncing embed...`);

        const { data: botConfig } = await supabase
          .from("bot_config")
          .select("*")
          .eq("guild_id", guildId)
          .single<BotConfig>();

        if (botConfig) await syncEmbed(botConfig);
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "bot_config" },
      async (payload) => {
        const updated = payload.new as BotConfig;
        if (!updated?.guild_id) return;

        console.log(`🔄 bot_config updated for guild ${updated.guild_id}, syncing embed...`);
        await syncEmbed(updated);
      }
    )
    .subscribe((status) => {
      console.log(`📡 Realtime subscription status: ${status}`);
    });
}

client.login(config.discordToken).catch((error) => {
  console.error("Failed to login:", error);
  process.exit(1);
});

// Démarrer la synchro Realtime une fois le client prêt
client.once(Events.ClientReady, async () => {
  await syncAllEmbeds();
  setupRealtimeSync();
});
