import { corsHeaders } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    await requireAdmin(authHeader);

    const serviceClient = createServiceClient();
    const url = new URL(req.url);
    const guildId = url.searchParams.get("guild_id");

    if (req.method === "GET") {
      if (!guildId) throw new Error("Missing guild_id");

      const { data, error } = await serviceClient
        .from("bot_config")
        .select("*")
        .eq("guild_id", guildId)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      return new Response(JSON.stringify(data ?? null), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST" || req.method === "PUT") {
      const body = await req.json();

      const { data, error } = await serviceClient
        .from("bot_config")
        .upsert(body, { onConflict: "guild_id" })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message === "Unauthorized" || message === "Forbidden: not an admin" ? 401 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
