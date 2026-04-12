import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { useOptions } from "../hooks/useOptions";
import OptionCard from "../components/OptionCard";
import OptionForm from "../components/OptionForm";
import EmbedPreview from "../components/EmbedPreview";
import type { ClanOption } from "../lib/types";

// Pour cette page on utilise un guild_id stocké en localStorage ou prompt
function useGuildId() {
  const stored = localStorage.getItem("guild_id") ?? "";
  const [guildId, setGuildId] = useState(stored);

  function save(id: string) {
    localStorage.setItem("guild_id", id);
    setGuildId(id);
  }

  return { guildId, save };
}

export default function Options() {
  const { guildId, save: saveGuildId } = useGuildId();
  const { options, loading, error, createOption, updateOption, deleteOption, reorderOptions } =
    useOptions(guildId || null);

  const [showForm, setShowForm] = useState(false);
  const [editingOption, setEditingOption] = useState<ClanOption | null>(null);
  const [guildInput, setGuildInput] = useState(guildId);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = options.findIndex((o) => o.id === active.id);
    const newIndex = options.findIndex((o) => o.id === over.id);
    const reordered = arrayMove(options, oldIndex, newIndex);
    reorderOptions(reordered);
  }

  async function handleSubmit(data: Omit<ClanOption, "id" | "created_at" | "updated_at">) {
    if (editingOption) {
      await updateOption(editingOption.id, data);
    } else {
      await createOption({ ...data, sort_order: options.length });
    }
    setShowForm(false);
    setEditingOption(null);
  }

  return (
    <div className="p-8 fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Clans</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(241,245,249,0.5)" }}>
            Gérez les options du select menu
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => {
            setEditingOption(null);
            setShowForm(true);
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouveau clan
        </button>
      </div>

      {/* Guild ID input */}
      {!guildId && (
        <div className="glass p-5 mb-6">
          <p className="text-sm text-white mb-3">Entrez le Guild ID pour charger les clans</p>
          <div className="flex gap-2">
            <input
              className="input-glass flex-1"
              value={guildInput}
              onChange={(e) => setGuildInput(e.target.value)}
              placeholder="Guild ID Discord"
            />
            <button className="btn-primary" onClick={() => saveGuildId(guildInput)}>
              Charger
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Liste */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          {/* Formulaire */}
          {showForm && (
            <div className="glass p-5">
              <h3 className="text-white font-semibold text-sm mb-4">
                {editingOption ? "Modifier le clan" : "Nouveau clan"}
              </h3>
              <OptionForm
                guildId={guildId}
                initial={editingOption}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingOption(null);
                }}
              />
            </div>
          )}

          {/* Options list */}
          {error && (
            <div className="rounded-xl px-4 py-3 text-sm text-red-400" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : options.length === 0 ? (
            <div className="glass flex flex-col items-center justify-center py-12 gap-3">
              <span className="text-3xl">🎫</span>
              <p className="text-sm" style={{ color: "rgba(241,245,249,0.4)" }}>
                Aucun clan configuré
              </p>
              <button
                className="btn-primary text-xs"
                onClick={() => {
                  setEditingOption(null);
                  setShowForm(true);
                }}
              >
                Créer le premier
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={options.map((o) => o.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-2">
                  {options.map((option) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      onEdit={(opt) => {
                        setEditingOption(opt);
                        setShowForm(true);
                      }}
                      onDelete={async (id) => {
                        if (confirm("Supprimer ce clan ?")) {
                          await deleteOption(id);
                        }
                      }}
                      onToggle={(id, enabled) => updateOption(id, { enabled })}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Preview */}
        <div className="xl:col-span-1">
          <div className="glass p-5 sticky top-8">
            <p className="text-xs font-medium mb-4" style={{ color: "rgba(241,245,249,0.5)" }}>
              Aperçu Discord
            </p>
            <EmbedPreview
              title="Ouvrir un ticket clan"
              color="#7C3AED"
              options={options
                .filter((o) => o.enabled)
                .map((o) => ({ label: o.label, emoji: o.emoji, description: o.description }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
