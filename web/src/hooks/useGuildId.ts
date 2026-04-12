import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useGuildId() {
  const [guildId, setGuildId] = useState<string>(
    () => localStorage.getItem("guild_id") ?? ""
  );
  const [loading, setLoading] = useState(!localStorage.getItem("guild_id"));

  useEffect(() => {
    if (guildId) {
      setLoading(false);
      return;
    }

    // Aucun guild_id en local → chercher en DB
    (async () => {
      try {
        const { data } = await supabase
          .from("bot_config")
          .select("guild_id")
          .limit(1)
          .single();
        if (data?.guild_id) {
          localStorage.setItem("guild_id", data.guild_id);
          setGuildId(data.guild_id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [guildId]);

  function save(id: string) {
    localStorage.setItem("guild_id", id);
    setGuildId(id);
  }

  return { guildId, loading, save };
}
