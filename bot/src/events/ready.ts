import { REST, Routes, type Client } from "discord.js";
import { config } from "../config.js";
import { data as ticketCloseCommand } from "../commands/ticketclose.js";
import { data as ticketAddCommand } from "../commands/ticketadd.js";
import { data as syncPermsCommand } from "../commands/syncperms.js";
import { ensureBotAccessToOpenTickets } from "../services/ticketService.js";

type RegisteredCommand = {
  id: string;
  name: string;
};

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
    syncPermsCommand.toJSON(),
  ];

  try {
    const globalCommands = await rest.put(Routes.applicationCommands(config.discordClientId), {
      body: commands,
    }) as RegisteredCommand[];
    console.log("✅ Global slash commands registered (ticketclose, ticketadd, sync-perms)");
    logRegisteredCommands("global", globalCommands);

    for (const guild of client.guilds.cache.values()) {
      const guildCommands = await rest.put(Routes.applicationGuildCommands(config.discordClientId, guild.id), {
        body: commands,
      }) as RegisteredCommand[];
      console.log(`✅ Guild slash commands registered for ${guild.id} (${guild.name})`);
      logRegisteredCommands(guild.id, guildCommands);
    }

    await ensureBotAccessToOpenTickets(client);
  } catch (error) {
    console.error("❌ Failed to register commands:", error);
  }
}

function logRegisteredCommands(scope: string, commands: RegisteredCommand[]): void {
  for (const command of commands) {
    console.log(`   ↳ ${scope}: /${command.name} id=${command.id}`);
  }
}
