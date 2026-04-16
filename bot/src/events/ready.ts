import { REST, Routes, type Client } from "discord.js";
import { config } from "../config.js";
import { data as setupCommand } from "../commands/setup.js";
import { data as ticketCloseCommand } from "../commands/ticketclose.js";
import { data as ticketAddCommand } from "../commands/ticketadd.js";
import { data as syncPermsCommand } from "../commands/syncperms.js";

export async function onReady(client: Client<true>): Promise<void> {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Vérifier les permissions du bot
  const requiredPermissions = ["ManageChannels", "SendMessages", "EmbedLinks"];
  console.log(`🔒 Required permissions: ${requiredPermissions.join(", ")}`);

  // Enregistrer les commandes slash globalement
  const rest = new REST().setToken(config.discordToken);

  try {
    await rest.put(Routes.applicationCommands(config.discordClientId), {
      body: [
        setupCommand.toJSON(),
        ticketCloseCommand.toJSON(),
        ticketAddCommand.toJSON(),
        syncPermsCommand.toJSON(),
      ],
    });
    console.log("✅ Slash commands registered (setup-clans, ticketclose, ticketadd, sync-perms)");
  } catch (error) {
    console.error("❌ Failed to register commands:", error);
  }
}
