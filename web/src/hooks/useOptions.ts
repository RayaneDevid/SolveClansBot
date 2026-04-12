import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { ClanOption } from "../lib/types";

export function useOptions(guildId: string | null) {
  const [options, setOptions] = useState<ClanOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("clan_options")
      .select("*")
      .eq("guild_id", guildId)
      .order("sort_order", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setOptions((data ?? []) as ClanOption[]);
    }
    setLoading(false);
  }, [guildId]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const createOption = async (
    option: Omit<ClanOption, "id" | "created_at" | "updated_at">
  ): Promise<ClanOption | null> => {
    const { data, error: createError } = await supabase
      .from("clan_options")
      .insert(option)
      .select()
      .single<ClanOption>();

    if (createError) {
      setError(createError.message);
      return null;
    }
    await fetchOptions();
    return data;
  };

  const updateOption = async (
    id: string,
    updates: Partial<ClanOption>
  ): Promise<boolean> => {
    const { error: updateError } = await supabase
      .from("clan_options")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }
    await fetchOptions();
    return true;
  };

  const deleteOption = async (id: string): Promise<boolean> => {
    const { error: deleteError } = await supabase
      .from("clan_options")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }
    await fetchOptions();
    return true;
  };

  const reorderOptions = async (reordered: ClanOption[]): Promise<void> => {
    setOptions(reordered);
    const updates = reordered.map((opt, index) => ({
      id: opt.id,
      sort_order: index,
    }));

    for (const update of updates) {
      await supabase
        .from("clan_options")
        .update({ sort_order: update.sort_order })
        .eq("id", update.id);
    }
  };

  return {
    options,
    loading,
    error,
    refetch: fetchOptions,
    createOption,
    updateOption,
    deleteOption,
    reorderOptions,
  };
}
