import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";

const DISCORD_API = "https://discord.com/api/v10";

interface ClanOption {
  id: string;
  label: string;
  description: string | null;
  emoji: string | null;
  enabled: boolean;
}

interface BotConfig {
  channel_id: string;
  message_id: string | null;
  embed_title: string | null;
  embed_color: string | null;
  banner_url: string | null;
}

function buildPayload(config: BotConfig, options: ClanOption[]) {
  const color = parseInt((config.embed_color ?? "#7C3AED").replace("#", ""), 16);
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const embeds: Record<string, unknown>[] = [];

  // Bannière en premier embed (image en haut)
  if (config.banner_url) {
    embeds.push({ color, image: { url: config.banner_url } });
  }

  const mainEmbed: Record<string, unknown> = {
    title: config.embed_title ?? "Ouvrir un ticket clan",
    description: [
      "**Fonctionnement des tickets**",
      "",
      "1️⃣ Sélectionnez votre clan dans le menu ci-dessous",
      "2️⃣ Renseignez votre Nom et Prénom RP dans la fenêtre prévue à cet effet",
      "",
      "**Règles de courtoisie**",
      "",
      "• Merci de rester poli et respectueux (Bonjour, Merci...)",
      "• Toute forme de harcèlement est interdite.",
      "",
      "**Sélection du ticket**",
      "ℹ️ Choisissez votre clan dans le menu ci-dessous",
    ].join("\n"),
    color,
    footer: { text: `Solve · Clans | ${date}` },
  };

  embeds.push(mainEmbed);

  const selectOptions = options
    .filter((o) => o.enabled)
    .slice(0, 25)
    .map((o) => {
      const opt: Record<string, unknown> = { label: o.label, value: o.id };
      if (o.description) opt.description = o.description;
      if (o.emoji) {
        const custom = o.emoji.match(/<:(\w+):(\d+)>/);
        opt.emoji = custom
          ? { name: custom[1], id: custom[2] }
          : { name: o.emoji };
      }
      return opt;
    });

  return {
    embeds,
    components: [{
      type: 1,
      components: [{
        type: 3,
        custom_id: "clan_select",
        placeholder: "🔽 Choisissez votre clan...",
        options: selectOptions,
      }],
    }],
  };
}

async function discordRequest(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<Response> {
  return fetch(`${DISCORD_API}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    await requireAdmin(authHeader);

    const { guild_id } = await req.json();
    if (!guild_id) {
      return new Response(JSON.stringify({ error: "guild_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createServiceClient();

    const [{ data: config }, { data: options }] = await Promise.all([
      supabase.from("bot_config").select("*").eq("guild_id", guild_id).single(),
      supabase
        .from("clan_options")
        .select("*")
        .eq("guild_id", guild_id)
        .eq("enabled", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (!config?.channel_id) {
      return new Response(JSON.stringify({ error: "Salon non configuré" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!options?.length) {
      return new Response(JSON.stringify({ error: "Aucune option de clan configurée" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const botToken = Deno.env.get("DISCORD_BOT_TOKEN");
    if (!botToken) {
      return new Response(JSON.stringify({ error: "DISCORD_BOT_TOKEN non configuré" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = buildPayload(config as BotConfig, options as ClanOption[]);
    let messageId: string | null = null;

    // Tenter d'éditer le message existant
    if (config.message_id) {
      const editRes = await discordRequest(
        "PATCH",
        `/channels/${config.channel_id}/messages/${config.message_id}`,
        botToken,
        payload,
      );
      if (editRes.ok) {
        messageId = (await editRes.json()).id;
      }
      // Si le message n'existe plus, on tombe en dessous pour en créer un nouveau
    }

    // Envoyer un nouveau message si pas de message_id ou si l'édition a échoué
    if (!messageId) {
      const sendRes = await discordRequest(
        "POST",
        `/channels/${config.channel_id}/messages`,
        botToken,
        payload,
      );
      if (!sendRes.ok) {
        const err = await sendRes.text();
        return new Response(JSON.stringify({ error: `Discord API: ${err}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      messageId = (await sendRes.json()).id;
    }

    // Sauvegarder le message_id
    await supabase
      .from("bot_config")
      .update({ message_id: messageId })
      .eq("guild_id", guild_id);

    return new Response(JSON.stringify({ success: true, message_id: messageId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
