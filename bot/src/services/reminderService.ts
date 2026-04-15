import { type Client, TextChannel } from "discord.js";
import { supabase } from "../supabase.js";

const REMINDER_INTERVAL_MS = 60 * 60 * 1000; // Vérification toutes les heures
const INACTIVITY_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

/**
 * Démarre le scheduler de rappels d'inactivité.
 * Vérifie toutes les heures les tickets ouverts depuis plus de 7 jours
 * où le créateur n'a envoyé aucun message.
 */
export function startReminderScheduler(client: Client): void {
  console.log("⏰ Scheduler de rappels démarré (vérification toutes les heures)");
  setInterval(() => checkInactiveTickets(client), REMINDER_INTERVAL_MS);
}

async function checkInactiveTickets(client: Client): Promise<void> {
  console.log("🔍 Vérification des tickets inactifs...");

  const threshold = new Date(Date.now() - INACTIVITY_THRESHOLD_MS).toISOString();

  // Tickets ouverts depuis plus de 7 jours sans rappel envoyé
  const { data: tickets, error } = await supabase
    .from("tickets")
    .select("id, channel_id, guild_id, user_id, opened_at")
    .eq("status", "open")
    .lt("opened_at", threshold)
    .is("last_reminder_sent_at", null);

  if (error) {
    console.error("❌ Erreur lors de la récupération des tickets inactifs :", error.message);
    return;
  }

  if (!tickets?.length) {
    console.log("✅ Aucun ticket inactif trouvé");
    return;
  }

  console.log(`⚠️ ${tickets.length} ticket(s) potentiellement inactif(s)`);

  for (const ticket of tickets) {
    await processTicketReminder(client, ticket);
  }
}

async function processTicketReminder(
  client: Client,
  ticket: { id: string; channel_id: string; guild_id: string; user_id: string; opened_at: string }
): Promise<void> {
  let channel: TextChannel;

  try {
    const fetched = await client.channels.fetch(ticket.channel_id);
    if (!(fetched instanceof TextChannel)) return;
    channel = fetched;
  } catch {
    // Channel supprimé mais ticket toujours ouvert en BDD — on le ferme proprement
    await supabase
      .from("tickets")
      .update({ status: "closed", closed_at: new Date().toISOString(), closed_by: "bot" })
      .eq("id", ticket.id);
    return;
  }

  // Vérifier si le créateur du ticket a envoyé un message
  const hasUserMessaged = await checkUserMessagedInChannel(channel, ticket.user_id, ticket.opened_at);

  if (hasUserMessaged) {
    // Le créateur a bien messagé → on marque le ticket pour ne plus le vérifier
    await supabase
      .from("tickets")
      .update({ last_reminder_sent_at: "inactive_check_skipped" })
      .eq("id", ticket.id);
    return;
  }

  // Envoyer le rappel
  try {
    await channel.send({
      content: `<@${ticket.user_id}> 👋 Rappel : ton ticket est ouvert depuis plus d'une semaine et aucun message n'a été envoyé. Merci de répondre ou de fermer le ticket avec \`/ticketclose\`.`,
    });

    await supabase
      .from("tickets")
      .update({ last_reminder_sent_at: new Date().toISOString() })
      .eq("id", ticket.id);

    console.log(`📨 Rappel envoyé pour le ticket ${ticket.channel_id} (user: ${ticket.user_id})`);
  } catch (err) {
    console.error(`❌ Erreur lors de l'envoi du rappel pour ${ticket.channel_id} :`, err);
  }
}

/**
 * Vérifie si l'utilisateur (créateur du ticket) a envoyé au moins un message
 * dans le channel depuis l'ouverture du ticket.
 */
async function checkUserMessagedInChannel(
  channel: TextChannel,
  userId: string,
  openedAt: string
): Promise<boolean> {
  try {
    // On cherche dans les 100 derniers messages si le créateur a parlé
    const messages = await channel.messages.fetch({ limit: 100 });
    const openedDate = new Date(openedAt);

    return messages.some(
      (msg) => msg.author.id === userId && msg.createdAt > openedDate && !msg.author.bot
    );
  } catch {
    return false;
  }
}
