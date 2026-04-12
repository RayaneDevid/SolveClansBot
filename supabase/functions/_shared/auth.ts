import { createSupabaseClient, createServiceClient } from "./supabase-client.ts";

export async function requireAdmin(authHeader: string): Promise<string> {
  const supabase = createSupabaseClient(authHeader);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  const discordId = user.user_metadata?.provider_id ?? user.user_metadata?.sub;
  if (!discordId) {
    throw new Error("No Discord ID found");
  }

  const serviceClient = createServiceClient();
  const { data: admin, error: adminError } = await serviceClient
    .from("admins")
    .select("id")
    .eq("discord_id", discordId)
    .single();

  if (adminError || !admin) {
    throw new Error("Forbidden: not an admin");
  }

  return discordId;
}
