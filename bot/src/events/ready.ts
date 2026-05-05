import { REST, Routes, type Client } from "discord.js";
import { config } from "../config.js";
import { data as ticketCloseCommand } from "../commands/ticketclose.js";
import { data as ticketAddCommand } from "../commands/ticketadd.js";

export async function onReady(client: Client<true>): Promise<void> {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`🧾 Runtime application id: ${client.application.id}`);
  console.log(`🧾 Configured DISCORD_CLIENT_ID: ${config.discordClientId}`);

  if (client.application.id !== config.discordClientId) {
    console.error(
      "❌ DISCORD_CLIENT_ID ne correspond pas au bot connecté. Les commandes slash peuvent être enregistrées sur une autre application."
    );
  }

  // Vérifier les permissions du bot
  const requiredPermissions = ["ManageChannels", "SendMessages", "EmbedLinks"];
  console.log(`🔒 Required permissions: ${requiredPermissions.join(", ")}`);

  // Enregistrer les commandes slash globalement
  const rest = new REST().setToken(config.discordToken);
  const commands = [
    ticketCloseCommand.toJSON(),
    ticketAddCommand.toJSON(),
  ];

  try {
    await rest.put(Routes.applicationCommands(config.discordClientId), {
      body: commands,
    });
    console.log("✅ Global slash commands registered (ticketclose, ticketadd)");

    for (const guild of client.guilds.cache.values()) {
      await rest.put(Routes.applicationGuildCommands(config.discordClientId, guild.id), {
        body: commands,
      });
      console.log(`✅ Guild slash commands registered for ${guild.id} (${guild.name})`);
    }
  } catch (error) {
    console.error("❌ Failed to register commands:", error);
  }
}
