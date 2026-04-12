import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";

const DISCORD_API = "https://discord.com/api/v10";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    await requireAdmin(authHeader);

    const { guild_id: guildId } = await req.json();

    if (!guildId) {
      return new Response(JSON.stringify({ error: "guild_id requis" }), {
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

    const headers = { Authorization: `Bot ${botToken}` };

    const [channelsRes, rolesRes, emojisRes] = await Promise.all([
      fetch(`${DISCORD_API}/guilds/${guildId}/channels`, { headers }),
      fetch(`${DISCORD_API}/guilds/${guildId}/roles`, { headers }),
      fetch(`${DISCORD_API}/guilds/${guildId}/emojis`, { headers }),
    ]);

    if (!channelsRes.ok || !rolesRes.ok) {
      return new Response(JSON.stringify({ error: "Impossible de contacter Discord. Vérifiez que le bot est dans le serveur." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const channels = await channelsRes.json();
    const roles = await rolesRes.json();
    const emojis = emojisRes.ok ? await emojisRes.json() : [];

    // Type 4 = GUILD_CATEGORY
    const categories = (channels as { id: string; name: string; type: number; position: number }[])
      .filter((c) => c.type === 4)
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ id: c.id, name: c.name }));

    // Exclure @everyone (id === guild_id) et les rôles de bot (managed)
    const filteredRoles = (roles as { id: string; name: string; color: number; managed: boolean; position: number }[])
      .filter((r) => r.id !== guildId && !r.managed)
      .sort((a, b) => b.position - a.position)
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.color ? `#${r.color.toString(16).padStart(6, "0")}` : null,
      }));

    const customEmojis = (emojis as { id: string; name: string; animated: boolean }[])
      .map((e) => ({
        id: e.id,
        name: e.name,
        animated: e.animated,
        string: e.animated ? `<a:${e.name}:${e.id}>` : `<:${e.name}:${e.id}>`,
        url: `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? "gif" : "webp"}?size=32`,
      }));

    return new Response(
      JSON.stringify({ categories, roles: filteredRoles, emojis: customEmojis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
