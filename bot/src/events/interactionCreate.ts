import {
  type Interaction,
  type ChatInputCommandInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
  type ButtonInteraction,
} from "discord.js";
import { execute as ticketCloseExecute } from "../commands/ticketclose.js";
import { execute as ticketAddExecute } from "../commands/ticketadd.js";
import { execute as syncPermsExecute } from "../commands/syncperms.js";
import { handleSelectMenu } from "../handlers/selectMenu.js";
import { handleModal } from "../handlers/modal.js";
import { handleTicketActions } from "../handlers/ticketActions.js";

export async function onInteractionCreate(interaction: Interaction): Promise<void> {
  try {
    const details = interaction.isChatInputCommand()
      ? ` command=/${interaction.commandName}`
      : "customId" in interaction
        ? ` customId=${interaction.customId}`
        : "";

    console.log(
      `📩 Interaction received type=${interaction.type}${details} guild=${interaction.guildId ?? "dm"} channel=${interaction.channelId ?? "none"} user=${interaction.user.id}`
    );

    if (interaction.isChatInputCommand()) {
      console.log(`💬 Slash command received: /${interaction.commandName}`);
      await handleCommand(interaction as ChatInputCommandInteraction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenu(interaction as StringSelectMenuInteraction);
    } else if (interaction.isModalSubmit()) {
      await handleModal(interaction as ModalSubmitInteraction);
    } else if (interaction.isButton()) {
      await handleTicketActions(interaction as ButtonInteraction);
    }
  } catch (error) {
    console.error("Unhandled interaction error:", error);
    if (!interaction.isRepliable()) return;

    const payload = {
      content: "❌ Une erreur est survenue pendant le traitement de cette interaction.",
      ephemeral: true,
    };

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    } catch (replyError) {
      console.error("Unable to send interaction error response:", replyError);
    }
  }
}

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  switch (interaction.commandName) {
    case "ticketclose":
      await ticketCloseExecute(interaction);
      break;
    case "ticketadd":
      await ticketAddExecute(interaction);
      break;
    case "sync-perms":
      await syncPermsExecute(interaction);
      break;
    default:
      await interaction.reply({
        content: "❌ Cette commande n'est pas reconnue par cette version du bot.",
        ephemeral: true,
      });
  }
}
