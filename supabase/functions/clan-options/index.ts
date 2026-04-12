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
    const id = url.searchParams.get("id");

    if (req.method === "GET") {
      const guildId = url.searchParams.get("guild_id");
      let query = serviceClient
        .from("clan_options")
        .select("*")
        .order("sort_order", { ascending: true });

      if (guildId) query = query.eq("guild_id", guildId);

      const { data, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { data, error } = await serviceClient
        .from("clan_options")
        .insert(body)
        .select()
        .single();
      if (error) throw error;

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PUT") {
      if (!id) throw new Error("Missing id");
      const body = await req.json();
      const { data, error } = await serviceClient
        .from("clan_options")
        .update(body)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "DELETE") {
      if (!id) throw new Error("Missing id");
      const { error } = await serviceClient
        .from("clan_options")
        .delete()
        .eq("id", id);
      if (error) throw error;

      return new Response(null, { status: 204, headers: corsHeaders });
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
