import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  type StringSelectMenuInteraction,
} from "discord.js";

export async function handleSelectMenu(
  interaction: StringSelectMenuInteraction
): Promise<void> {
  if (interaction.customId !== "clan_select") return;

  const clanOptionId = interaction.values[0];

  const modal = new ModalBuilder()
    .setCustomId(`clan_modal:${clanOptionId}`)
    .setTitle("Identité RP");

  const firstNameInput = new TextInputBuilder()
    .setCustomId("rp_first_name")
    .setLabel("Prénom RP")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  const lastNameInput = new TextInputBuilder()
    .setCustomId("rp_last_name")
    .setLabel("Nom RP")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(50);

  const row1 = new ActionRowBuilder<TextInputBuilder>().addComponents(firstNameInput);
  const row2 = new ActionRowBuilder<TextInputBuilder>().addComponents(lastNameInput);

  modal.addComponents(row1, row2);

  await interaction.showModal(modal);
}
