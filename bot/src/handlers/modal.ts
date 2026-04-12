import { type ModalSubmitInteraction } from "discord.js";
import { supabase } from "../supabase.js";
import { createTicket } from "../services/ticketService.js";
import type { ClanOption } from "../types.js";

export async function handleModal(
  interaction: ModalSubmitInteraction
): Promise<void> {
  if (!interaction.customId.startsWith("clan_modal:")) return;

  const clanOptionId = interaction.customId.split(":")[1];

  await interaction.deferReply({ ephemeral: true });

  const firstName = interaction.fields.getTextInputValue("rp_first_name").trim();
  const lastName = interaction.fields.getTextInputValue("rp_last_name").trim();

  // Récupérer l'option du clan
  const { data: clanOption, error } = await supabase
    .from("clan_options")
    .select("*")
    .eq("id", clanOptionId)
    .single<ClanOption>();

  if (error || !clanOption) {
    await interaction.editReply({
      content: "❌ Ce clan n'existe plus. Contactez un administrateur.",
    });
    return;
  }

  if (!interaction.guild || !interaction.member) {
    await interaction.editReply({ content: "❌ Erreur : guild introuvable." });
    return;
  }

  try {
    const { channelId } = await createTicket(
      interaction.guild,
      interaction.member as Parameters<typeof createTicket>[1],
      clanOption,
      firstName,
      lastName
    );

    await interaction.editReply({
      content: `✅ Ton ticket a été créé : <#${channelId}>`,
    });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("ticket_exists:")) {
      const channelId = err.message.split(":")[1];
      await interaction.editReply({
        content: `⚠️ Tu as déjà un ticket ouvert : <#${channelId}>`,
      });
    } else {
      console.error("Error creating ticket:", err);
      await interaction.editReply({
        content: "❌ Une erreur est survenue lors de la création du ticket.",
      });
    }
  }
}
