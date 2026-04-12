import { useState, useEffect, useRef } from "react";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";
import { supabase } from "../lib/supabase";
import type { ClanOption } from "../lib/types";

interface DiscordCategory { id: string; name: string }
interface DiscordRole { id: string; name: string; color: string | null }

interface GuildData {
  categories: DiscordCategory[];
  roles: DiscordRole[];
}

interface Props {
  guildId: string;
  initial?: ClanOption | null;
  onSubmit: (data: Omit<ClanOption, "id" | "created_at" | "updated_at">) => Promise<void>;
  onCancel: () => void;
}

export default function OptionForm({ guildId, initial, onSubmit, onCancel }: Props) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [emoji, setEmoji] = useState(initial?.emoji ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? "");
  const [staffRoleId, setStaffRoleId] = useState(initial?.staff_role_id ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? true);
  const [submitting, setSubmitting] = useState(false);

  const [guildData, setGuildData] = useState<GuildData | null>(null);
  const [loadingGuild, setLoadingGuild] = useState(false);
  const [guildError, setGuildError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  function handleEmojiSelect(em: { native: string }) {
    setEmoji(em.native);
    setShowEmojiPicker(false);
  }

  useEffect(() => {
    if (initial) {
      setLabel(initial.label);
      setEmoji(initial.emoji ?? "");
      setDescription(initial.description ?? "");
      setCategoryId(initial.category_id);
      setStaffRoleId(initial.staff_role_id ?? "");
      setEnabled(initial.enabled);
    }
  }, [initial]);

  useEffect(() => {
    if (!guildId) return;
    setLoadingGuild(true);
    setGuildError(null);

    supabase.functions
      .invoke("discord-guild-data", { body: { guild_id: guildId } })
      .then(({ data, error }) => {
        if (error || data?.error) {
          setGuildError(data?.error ?? error?.message ?? "Erreur");
        } else {
          setGuildData(data as GuildData);
        }
      })
      .finally(() => setLoadingGuild(false));
  }, [guildId]);

  // Fermer le picker en cliquant dehors
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !categoryId.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        guild_id: guildId,
        label: label.trim(),
        emoji: emoji.trim() || null,
        description: description.trim() || null,
        category_id: categoryId.trim(),
        staff_role_id: staffRoleId || null,
        sort_order: initial?.sort_order ?? 0,
        enabled,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const selectClass = "input-glass appearance-none cursor-pointer";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">

        {/* Label */}
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "rgba(241,245,249,0.7)" }}>
            Nom du clan <span className="text-red-400">*</span>
          </label>
          <input
            className="input-glass"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Hyûga"
            required
          />
        </div>

        {/* Emoji */}
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "rgba(241,245,249,0.7)" }}>
            Emoji
          </label>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1" ref={emojiPickerRef}>
              <div className="flex gap-2 items-center">
                {/* Preview + bouton picker */}
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-xl transition-colors"
                  style={{
                    background: showEmojiPicker ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  title="Choisir un emoji"
                >
                  {emoji || "😀"}
                </button>
                <input
                  className="input-glass flex-1"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  placeholder="😀"
                />
                {emoji && (
                  <button
                    type="button"
                    onClick={() => setEmoji("")}
                    className="text-xs px-2 py-1 rounded-lg"
                    style={{ color: "rgba(241,245,249,0.4)", background: "rgba(255,255,255,0.05)" }}
                  >
                    ✕
                  </button>
                )}
              </div>
              {showEmojiPicker && (
                <div className="absolute left-0 top-11 z-50 shadow-2xl" style={{ borderRadius: "12px", overflow: "hidden" }}>
                  <Picker
                    data={data}
                    onEmojiSelect={handleEmojiSelect}
                    theme="dark"
                    locale="fr"
                    previewPosition="none"
                    skinTonePosition="none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "rgba(241,245,249,0.7)" }}>
            Description
          </label>
          <input
            className="input-glass"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description courte (affichée dans le select)"
          />
        </div>

        {/* Catégorie */}
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "rgba(241,245,249,0.7)" }}>
            Catégorie Discord <span className="text-red-400">*</span>
          </label>
          {loadingGuild ? (
            <div className="input-glass flex items-center gap-2" style={{ color: "rgba(241,245,249,0.3)" }}>
              <div className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Chargement...</span>
            </div>
          ) : guildData?.categories.length ? (
            <select
              className={selectClass}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">Sélectionner une catégorie...</option>
              {guildData.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  📁 {c.name}
                </option>
              ))}
            </select>
          ) : (
            <>
              <input
                className="input-glass"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                placeholder="1234567890123456789"
                required
              />
              {guildError && (
                <p className="text-xs text-yellow-400">⚠️ {guildError} — saisie manuelle</p>
              )}
            </>
          )}
        </div>

        {/* Rôle staff */}
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "rgba(241,245,249,0.7)" }}>
            Rôle staff (optionnel)
          </label>
          {loadingGuild ? (
            <div className="input-glass flex items-center gap-2" style={{ color: "rgba(241,245,249,0.3)" }}>
              <div className="w-3 h-3 border border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Chargement...</span>
            </div>
          ) : guildData?.roles.length ? (
            <select
              className={selectClass}
              value={staffRoleId}
              onChange={(e) => setStaffRoleId(e.target.value)}
            >
              <option value="">Aucun rôle</option>
              {guildData.roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.color && r.color !== "#000000" ? "● " : ""}{r.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input-glass"
              value={staffRoleId}
              onChange={(e) => setStaffRoleId(e.target.value)}
              placeholder="1234567890123456789"
            />
          )}
        </div>

        {/* Enabled */}
        <div className="col-span-2 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className="relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0"
            style={{
              background: enabled
                ? "linear-gradient(135deg, #7c3aed, #6366f1)"
                : "rgba(255,255,255,0.1)",
            }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
              style={{ left: enabled ? "calc(100% - 18px)" : "2px" }}
            />
          </button>
          <span className="text-sm" style={{ color: "rgba(241,245,249,0.7)" }}>
            {enabled ? "Activé" : "Désactivé"}
          </span>
        </div>
      </div>

      <div className="flex gap-2 justify-end mt-2">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? "Enregistrement..." : initial ? "Mettre à jour" : "Créer"}
        </button>
      </div>
    </form>
  );
}
