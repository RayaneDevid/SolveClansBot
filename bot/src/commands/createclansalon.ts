import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  type Role,
} from "discord.js";
import { supabase } from "../supabase.js";
import type { ClanOption } from "../types.js";

// Jusqu'à 5 rôles supplémentaires en argument
const MAX_EXTRA_ROLES = 5;

export const data = (() => {
  const builder = new SlashCommandBuilder()
    .setName("create-clan-salon")
    .setDescription(
      "Crée un salon dans chaque catégorie de clan configurée sur le panel"
    )
    .addStringOption((o) =>
      o
        .setName("nom")
        .setDescription("Nom du salon à créer dans chaque catégorie")
        .setRequired(true)
        .setMaxLength(100)
    );

  for (let i = 1; i <= MAX_EXTRA_ROLES; i++) {
    builder.addRoleOption((o) =>
      o
        .setName(`role${i}`)
        .setDescription(`Rôle supplémentaire pouvant voir le salon`)
        .setRequired(false)
    );
  }

  return builder;
})();

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild!;
  const channelName = interaction.options
    .getString("nom", true)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "");

  if (!channelName) {
    await interaction.editReply({ content: "❌ Nom de salon invalide." });
    return;
  }

  // Rôles supplémentaires passés en arguments
  const extraRoles: Role[] = [];
  for (let i = 1; i <= MAX_EXTRA_ROLES; i++) {
    const role = interaction.options.getRole(`role${i}`) as Role | null;
    if (role) extraRoles.push(role);
  }

  // Récupérer les clans configurés (groupés par catégorie pour dédupliquer)
  const { data: options, error } = await supabase
    .from("clan_options")
    .select("category_id, staff_role_id, label")
    .eq("guild_id", guild.id)
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  if (error || !options?.length) {
    await interaction.editReply({
      content: "❌ Aucun clan configuré. Ajoutez des clans depuis le panel web.",
    });
    return;
  }

  // Dédupliquer par catégorie (une seule catégorie peut avoir plusieurs clans)
  const categorySeen = new Map<string, { staffRoleId: string | null; label: string }>();
  for (const opt of options as ClanOption[]) {
    if (!categorySeen.has(opt.category_id)) {
      categorySeen.set(opt.category_id, {
        staffRoleId: opt.staff_role_id ?? null,
        label: opt.label,
      });
    }
  }

  let created = 0;
  let failed = 0;
  const results: string[] = [];

  for (const [categoryId, { staffRoleId, label }] of categorySeen) {
    try {
      // Vérifier que la catégorie existe
      const category = await guild.channels.fetch(categoryId).catch(() => null);
      if (!category || category.type !== ChannelType.GuildCategory) {
        results.push(`⚠️ Catégorie introuvable pour **${label}** (ID: \`${categoryId}\`)`);
        failed++;
        continue;
      }

      const permissionOverwrites: {
        id: string;
        allow?: bigint[];
        deny?: bigint[];
      }[] = [
        // @everyone ne voit pas le salon
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
      ];

      // Rôle staff du clan : voir + écrire + gérer
      if (staffRoleId) {
        permissionOverwrites.push({
          id: staffRoleId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
            PermissionFlagsBits.ManageMessages,
            PermissionFlagsBits.ManageChannels,
          ],
        });
      }

      // Rôles supplémentaires : voir + lire + écrire
      for (const role of extraRoles) {
        permissionOverwrites.push({
          id: role.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        });
      }

      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryId,
        permissionOverwrites,
        reason: `Création en masse par ${interaction.user.tag}`,
      });

      results.push(`✅ <#${channel.id}> → **${label}**`);
      created++;
    } catch (err) {
      console.error(`❌ Erreur création salon dans catégorie ${categoryId} :`, err);
      results.push(`❌ Échec pour **${label}** (catégorie \`${categoryId}\`)`);
      failed++;
    }
  }

  const summary =
    `**${created}** salon(s) créé(s)${failed > 0 ? `, ${failed} échec(s)` : ""}` +
    (extraRoles.length
      ? `\n Rôles supplémentaires : ${extraRoles.map((r) => `<@&${r.id}>`).join(", ")}`
      : "");

  // Discord limite les messages à 2000 caractères — tronquer si nécessaire
  const detail = results.join("\n");
  const content = `${summary}\n\n${detail}`.slice(0, 2000);

  await interaction.editReply({ content });
}
