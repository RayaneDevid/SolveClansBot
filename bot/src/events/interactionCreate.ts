import {
  type Interaction,
  type ChatInputCommandInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
  type ButtonInteraction,
} from "discord.js";
import { execute as setupExecute } from "../commands/setup.js";
import { execute as ticketCloseExecute } from "../commands/ticketclose.js";
import { execute as ticketAddExecute } from "../commands/ticketadd.js";
import { handleSelectMenu } from "../handlers/selectMenu.js";
import { handleModal } from "../handlers/modal.js";
import { handleTicketActions } from "../handlers/ticketActions.js";

export async function onInteractionCreate(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
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
  }
}

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  switch (interaction.commandName) {
    case "setup-clans":
      await setupExecute(interaction);
      break;
    case "ticketclose":
      await ticketCloseExecute(interaction);
      break;
    case "ticketadd":
      await ticketAddExecute(interaction);
      break;
  }
}
