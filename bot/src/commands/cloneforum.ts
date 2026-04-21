import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ChannelType,
  type ForumChannel,
  type AnyThreadChannel,
} from "discord.js";

const THREAD_DELAY_MS = 1200;
const MESSAGE_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const data = new SlashCommandBuilder()
  .setName("clone-forum")
  .setDescription("Duplique un salon forum avec ses permissions, tags et posts")
  .addChannelOption((o) =>
    o
      .setName("forum")
      .setDescription("Le salon forum à dupliquer")
      .setRequired(true)
      .addChannelTypes(ChannelType.GuildForum)
  )
  .addStringOption((o) =>
    o
      .setName("nom")
      .setDescription("Nom du nouveau forum (défaut : nom-original-copie)")
      .setRequired(false)
  )
  .addBooleanOption((o) =>
    o
      .setName("messages")
      .setDescription(
        "Copier tout l'historique de chaque post — plus lent (défaut : premier message uniquement)"
      )
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild!;
  const source = interaction.options.getChannel("forum", true) as ForumChannel;
  const newName = interaction.options.getString("nom") ?? `${source.name}-copie`;
  const copyAllMessages = interaction.options.getBoolean("messages") ?? false;

  // 1. Créer le nouveau forum avec les mêmes paramètres
  let newForum: ForumChannel;
  try {
    newForum = (await guild.channels.create({
      name: newName,
      type: ChannelType.GuildForum,
      parent: source.parentId ?? undefined,
      topic: source.topic ?? undefined,
      nsfw: source.nsfw,
      rateLimitPerUser: source.rateLimitPerUser ?? undefined,
      defaultAutoArchiveDuration: source.defaultAutoArchiveDuration ?? undefined,
      defaultReactionEmoji: source.defaultReactionEmoji ?? undefined,
      defaultSortOrder: source.defaultSortOrder ?? undefined,
      defaultForumLayout: source.defaultForumLayout,
      defaultThreadRateLimitPerUser: source.defaultThreadRateLimitPerUser ?? undefined,
      availableTags: source.availableTags.map((t) => ({
        name: t.name,
        moderated: t.moderated,
        emoji: t.emoji ?? undefined,
      })),
      permissionOverwrites: source.permissionOverwrites.cache.map((ow) => ({
        id: ow.id,
        type: ow.type,
        allow: ow.allow.bitfield,
        deny: ow.deny.bitfield,
      })),
      reason: `Clone de ${source.name} par ${interaction.user.tag}`,
    })) as ForumChannel;
  } catch (err) {
    console.error("❌ Erreur création forum :", err);
    await interaction.editReply({ content: "❌ Impossible de créer le forum. Vérifie les permissions du bot." });
    return;
  }

  // Mapping ancien tag ID → nouveau tag ID (par nom)
  const tagIdMap = new Map<string, string>();
  for (const oldTag of source.availableTags) {
    const newTag = newForum.availableTags.find((t) => t.name === oldTag.name);
    if (newTag) tagIdMap.set(oldTag.id, newTag.id);
  }

  // 2. Récupérer tous les threads (actifs + archivés paginés)
  const threads: AnyThreadChannel[] = [];

  const active = await source.threads.fetchActive();
  threads.push(...active.threads.values());

  let hasMore = true;
  let before: string | undefined;
  while (hasMore) {
    const archived = await source.threads.fetchArchived({ limit: 100, before });
    threads.push(...archived.threads.values());
    hasMore = archived.hasMore;
    const last = archived.threads.last();
    before = last?.id;
    if (!last) break;
  }

  if (!threads.length) {
    await interaction.editReply({
      content: `✅ Forum **${newName}** créé (aucun post à copier).`,
    });
    return;
  }

  await interaction.editReply({
    content: `🔄 Forum créé. Copie de **${threads.length}** post(s)...`,
  });

  let copied = 0;
  let failed = 0;

  for (const thread of threads) {
    try {
      // Récupérer les messages du thread (max 100 par page)
      const fetched = await thread.messages.fetch({ limit: 100 });
      const sorted = [...fetched.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      const firstMsg = sorted[0];
      if (!firstMsg) { failed++; continue; }

      const mappedTags = (thread.appliedTags ?? [])
        .map((id) => tagIdMap.get(id))
        .filter((id): id is string => Boolean(id));

      const newThread = await newForum.threads.create({
        name: thread.name,
        message: {
          content: firstMsg.content || "\u200b",
          embeds: firstMsg.embeds.slice(0, 10),
          files: [...firstMsg.attachments.values()].map((a) => a.url),
        },
        appliedTags: mappedTags,
        reason: `Clone de ${source.name}`,
      });

      // Copier les messages suivants si demandé
      if (copyAllMessages && sorted.length > 1) {
        for (const msg of sorted.slice(1)) {
          const hasContent = msg.content || msg.embeds.length || msg.attachments.size;
          if (!hasContent) continue;

          await newThread.send({
            content: msg.content || undefined,
            embeds: msg.embeds.slice(0, 10),
            files: [...msg.attachments.values()].map((a) => a.url),
          });
          await sleep(MESSAGE_DELAY_MS);
        }
      }

      if (thread.archived) {
        await newThread.setArchived(true).catch(() => null);
      }

      copied++;
    } catch (err) {
      console.error(`❌ Erreur copie post "${thread.name}" :`, err);
      failed++;
    }

    await sleep(THREAD_DELAY_MS);
  }

  await interaction.editReply({
    content:
      `✅ Forum **${newName}** créé avec **${copied}** post(s) copié(s).` +
      (failed > 0 ? ` ⚠️ ${failed} post(s) ignoré(s) (erreur ou premier message vide).` : ""),
  });
}
