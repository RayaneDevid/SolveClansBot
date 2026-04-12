import { useState, useEffect } from "react";
import type { ClanOption } from "../lib/types";

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
        staff_role_id: staffRoleId.trim() || null,
        sort_order: initial?.sort_order ?? 0,
        enabled,
      });
    } finally {
      setSubmitting(false);
    }
  }

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
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "rgba(241,245,249,0.7)" }}>
            Emoji
          </label>
          <input
            className="input-glass"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="👁 ou <:name:id>"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "rgba(241,245,249,0.7)" }}>
            Description
          </label>
          <input
            className="input-glass"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description courte"
          />
        </div>

        {/* Category ID */}
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "rgba(241,245,249,0.7)" }}>
            ID de la catégorie Discord <span className="text-red-400">*</span>
          </label>
          <input
            className="input-glass"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            placeholder="1234567890123456789"
            required
          />
          <p className="text-xs" style={{ color: "rgba(241,245,249,0.3)" }}>
            Clic droit sur la catégorie Discord → Copier l'identifiant
          </p>
        </div>

        {/* Staff Role ID */}
        <div className="col-span-2 flex flex-col gap-1.5">
          <label className="text-xs font-medium" style={{ color: "rgba(241,245,249,0.7)" }}>
            ID du rôle staff (optionnel)
          </label>
          <input
            className="input-glass"
            value={staffRoleId}
            onChange={(e) => setStaffRoleId(e.target.value)}
            placeholder="1234567890123456789"
          />
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
