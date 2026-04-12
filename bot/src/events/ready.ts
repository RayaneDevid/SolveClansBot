import { REST, Routes, type Client } from "discord.js";
import { config } from "../config.js";
import { data as setupCommand } from "../commands/setup.js";

export async function onReady(client: Client<true>): Promise<void> {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Vérifier les permissions du bot
  const requiredPermissions = ["ManageChannels", "SendMessages", "EmbedLinks"];
  console.log(`🔒 Required permissions: ${requiredPermissions.join(", ")}`);

  // Enregistrer les commandes slash globalement
  const rest = new REST().setToken(config.discordToken);

  try {
    await rest.put(Routes.applicationCommands(config.discordClientId), {
      body: [setupCommand.toJSON()],
    });
    console.log("✅ Slash commands registered");
  } catch (error) {
    console.error("❌ Failed to register commands:", error);
  }
}
