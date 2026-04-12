import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

async function checkAdmin(discordId: string): Promise<boolean> {
  const { data } = await supabase
    .from("admins")
    .select("id")
    .eq("discord_id", discordId)
    .maybeSingle();
  return !!data;
}

export default function Callback() {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleCallback() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          navigate("/login", { replace: true });
          return;
        }

        const discordId =
          session.user.user_metadata?.provider_id ??
          session.user.identities?.[0]?.id;

        if (!discordId) {
          navigate("/unauthorized", { replace: true });
          return;
        }

        const isAdmin = await checkAdmin(discordId);
        navigate(isAdmin ? "/dashboard" : "/unauthorized", { replace: true });
      } catch {
        navigate("/login", { replace: true });
      }
    }

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0a0f" }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-white/50 text-sm">Connexion en cours...</p>
      </div>
    </div>
  );
}
