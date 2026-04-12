import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ClanOption } from "../lib/types";

interface Props {
  option: ClanOption;
  onEdit: (option: ClanOption) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
}

export default function OptionCard({ option, onEdit, onDelete, onToggle }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: option.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="glass flex items-center gap-4 px-4 py-3 group"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing shrink-0"
        style={{ color: "rgba(241,245,249,0.3)" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      </div>

      {/* Emoji */}
      <div className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 text-lg"
        style={{ background: "rgba(124,58,237,0.15)" }}>
        {option.emoji || "🎫"}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{option.label}</p>
        {option.description && (
          <p className="text-xs truncate" style={{ color: "rgba(241,245,249,0.4)" }}>
            {option.description}
          </p>
        )}
        <p className="text-xs mt-0.5" style={{ color: "rgba(241,245,249,0.25)" }}>
          Cat: {option.category_id}
          {option.staff_role_id && ` · Role: ${option.staff_role_id}`}
        </p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Toggle */}
        <button
          onClick={() => onToggle(option.id, !option.enabled)}
          className="relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0"
          style={{
            background: option.enabled
              ? "linear-gradient(135deg, #7c3aed, #6366f1)"
              : "rgba(255,255,255,0.1)",
          }}
          title={option.enabled ? "Désactiver" : "Activer"}
        >
          <div
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
            style={{ left: option.enabled ? "calc(100% - 18px)" : "2px" }}
          />
        </button>

        {/* Edit */}
        <button
          onClick={() => onEdit(option)}
          className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "rgba(241,245,249,0.7)",
          }}
          title="Modifier"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(option.id)}
          className="p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
          style={{
            background: "rgba(239,68,68,0.1)",
            color: "#f87171",
          }}
          title="Supprimer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
