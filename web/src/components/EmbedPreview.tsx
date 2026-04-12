interface Props {
  title: string;
  color: string;
  bannerUrl?: string;
  options: Array<{ label: string; emoji: string | null; description: string | null }>;
}

export default function EmbedPreview({ title, color, bannerUrl, options }: Props) {
  return (
    <div
      className="rounded-lg overflow-hidden max-w-sm"
      style={{
        background: "#2b2d31",
        borderLeft: `4px solid ${color}`,
        fontFamily: "Whitney, 'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
    >
      {bannerUrl && (
        <img
          src={bannerUrl}
          alt="Banner"
          className="w-full object-cover"
          style={{ maxHeight: 120 }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <div className="p-3">
        <p className="text-white font-semibold text-sm mb-2">{title || "Ouvrir un ticket clan"}</p>
        <p className="text-xs mb-1" style={{ color: "#b5bac1" }}>
          <strong style={{ color: "#dbdee1" }}>Fonctionnement des tickets</strong>
        </p>
        <p className="text-xs" style={{ color: "#b5bac1" }}>
          1️⃣ Sélectionnez votre clan
          <br />
          2️⃣ Renseignez votre Nom et Prénom RP
        </p>
        <p className="text-xs mt-2 mb-1" style={{ color: "#b5bac1" }}>
          <strong style={{ color: "#dbdee1" }}>Règles de courtoisie</strong>
        </p>
        <p className="text-xs" style={{ color: "#b5bac1" }}>
          • Restez poli et respectueux
          <br />• Toute forme de harcèlement est interdite.
        </p>
        <p className="text-xs mt-2" style={{ color: "#b5bac1" }}>
          ℹ️ Choisissez votre clan dans le menu ci-dessous
        </p>

        <p className="text-xs mt-3" style={{ color: "#87898c" }}>
          Solve · Clans | {new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Faux select */}
      <div className="mx-3 mb-3">
        <div
          className="rounded-md px-3 py-2 text-xs flex items-center justify-between cursor-default"
          style={{ background: "#1e1f22", color: "#b5bac1", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <span>
            {options.length > 0 ? (
              <span>
                {options[0].emoji && <span className="mr-1">{options[0].emoji}</span>}
                {options[0].label}
              </span>
            ) : (
              "🔽 Choisissez votre clan..."
            )}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        {options.length > 1 && (
          <div
            className="rounded-md mt-1 py-1 text-xs"
            style={{ background: "#1e1f22", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {options.slice(0, 5).map((opt, i) => (
              <div
                key={i}
                className="px-3 py-1.5 hover:bg-white/5 cursor-default flex items-center gap-2"
                style={{ color: "#dbdee1" }}
              >
                {opt.emoji && <span>{opt.emoji}</span>}
                <div>
                  <p className="text-xs">{opt.label}</p>
                  {opt.description && (
                    <p className="text-xs" style={{ color: "#87898c" }}>
                      {opt.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {options.length > 5 && (
              <p className="px-3 py-1 text-xs" style={{ color: "#87898c" }}>
                +{options.length - 5} autres...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
