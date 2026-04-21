import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useGuildId } from "../hooks/useGuildId";
import EmbedPreview from "../components/EmbedPreview";
import type { BotConfig } from "../lib/types";

const DEFAULT_CONFIG: Omit<BotConfig, "id" | "created_at" | "updated_at"> = {
  guild_id: "",
  channel_id: "",
  message_id: null,
  embed_title: "Ouvrir un ticket clan",
  embed_color: "#7C3AED",
  banner_url: "",
  log_channel_id: "",
  staff_role_ids: [],
};

export default function Settings() {
  const { guildId: savedGuildId, save: saveGuildId } = useGuildId();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [deployStatus, setDeployStatus] = useState<
    "idle" | "success" | "error" | "no_channel"
  >("idle");
  const [hasExistingEmbed, setHasExistingEmbed] = useState(false);

  const fetchConfig = useCallback(async (guildId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from("bot_config")
      .select("*")
      .eq("guild_id", guildId)
      .single<BotConfig>();

    if (data) {
      setConfig({
        guild_id: data.guild_id,
        channel_id: data.channel_id ?? "",
        message_id: data.message_id,
        embed_title: data.embed_title ?? "Ouvrir un ticket clan",
        embed_color: data.embed_color ?? "#7C3AED",
        banner_url: data.banner_url ?? "",
        log_channel_id: data.log_channel_id ?? "",
        staff_role_ids: data.staff_role_ids ?? [],
      });
      setHasExistingEmbed(!!data.message_id && !!data.channel_id);
    } else {
      setConfig({ ...DEFAULT_CONFIG, guild_id: guildId });
      setHasExistingEmbed(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (savedGuildId) {
      fetchConfig(savedGuildId);
    }
  }, [savedGuildId, fetchConfig]);

  function updateField<K extends keyof typeof config>(key: K, value: (typeof config)[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaveStatus("idle");
    setDeployStatus("idle");
  }

  function parseRoleIds(input: string): string[] {
    const tokens = input
      .split(/[\s,;\n]+/g)
      .map((t) => t.trim())
      .filter(Boolean);

    const ids = tokens
      .map((t) => t.replace(/[^\d]/g, ""))
      .filter(Boolean);

    return [...new Set(ids)];
  }

  function roleIdsToText(ids: string[] | null | undefined): string {
    return (ids ?? []).join("\n");
  }

  async function handleSave() {
    if (!config.guild_id.trim()) return;
    setSaving(true);
    setSaveStatus("idle");

    const { error } = await supabase.from("bot_config").upsert(
      {
        guild_id: config.guild_id.trim(),
        channel_id: config.channel_id?.trim() || null,
        message_id: config.message_id,
        embed_title: config.embed_title?.trim() || "Ouvrir un ticket clan",
        embed_color: config.embed_color || "#7C3AED",
        banner_url: config.banner_url?.trim() || null,
        log_channel_id: config.log_channel_id?.trim() || null,
        staff_role_ids: (config.staff_role_ids ?? []).filter(Boolean),
      },
      { onConflict: "guild_id" }
    );

    if (!error) {
      saveGuildId(config.guild_id.trim());
      setSaveStatus("saved");
      await fetchConfig(config.guild_id.trim());
    } else {
      setSaveStatus("error");
    }
    setSaving(false);
    setTimeout(() => setSaveStatus("idle"), 3000);
  }

  async function handleDeploy() {
    if (!config.channel_id?.trim()) {
      setDeployStatus("no_channel");
      return;
    }
    setDeploying(true);
    setDeployStatus("idle");

    const { data, error } = await supabase.functions.invoke("deploy-embed", {
      body: { guild_id: config.guild_id.trim() },
    });

    if (!error && data?.success) {
      setConfig((prev) => ({ ...prev, message_id: data.message_id }));
      setHasExistingEmbed(true);
      setDeployStatus("success");
    } else {
      const msg = data?.error ?? error?.message ?? "Erreur inconnue";
      console.error("deploy-embed:", msg);
      setDeployStatus("error");
    }
    setDeploying(false);
    setTimeout(() => setDeployStatus("idle"), 5000);
  }

  return (
    <div className="p-8 fade-in max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(241,245,249,0.5)" }}>
          Configuration du bot et de l'embed
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Form */}
        <div className="xl:col-span-3 flex flex-col gap-5">

          {/* Section : Serveur */}
          <Section title="Serveur Discord" icon="🖥️">
            <Field
              label="Guild ID"
              hint="Clic droit sur le serveur → Copier l'identifiant"
              required
            >
              <input
                className="input-glass"
                value={config.guild_id}
                onChange={(e) => updateField("guild_id", e.target.value)}
                placeholder="1234567890123456789"
              />
            </Field>
          </Section>

          {/* Section : Canaux */}
          <Section title="Canaux" icon="📢">
            <Field
              label="Salon de l'embed"
              hint="Le salon où le bot postera / mettra à jour l'embed"
              required
            >
              <input
                className="input-glass"
                value={config.channel_id ?? ""}
                onChange={(e) => updateField("channel_id", e.target.value)}
                placeholder="ID du salon"
              />
            </Field>
            <Field
              label="Salon des logs"
              hint="Les fermetures de tickets seront notifiées ici (optionnel)"
            >
              <input
                className="input-glass"
                value={config.log_channel_id ?? ""}
                onChange={(e) => updateField("log_channel_id", e.target.value)}
                placeholder="ID du salon de logs"
              />
            </Field>
          </Section>

          {/* Section : Commandes */}
          <Section title="Commandes" icon="🛡️">
            <Field
              label="Rôles staff (commandes)"
              hint="IDs des rôles autorisés à utiliser les commandes (un par ligne). Tu peux coller une mention de rôle."
            >
              <textarea
                className="input-glass min-h-[92px] font-mono text-xs"
                value={roleIdsToText(config.staff_role_ids)}
                onChange={(e) => updateField("staff_role_ids", parseRoleIds(e.target.value))}
                placeholder={"123456789012345678\n987654321098765432"}
              />
            </Field>
          </Section>

          {/* Section : Embed */}
          <Section title="Personnalisation de l'embed" icon="🎨">
            <Field label="Titre de l'embed">
              <input
                className="input-glass"
                value={config.embed_title ?? ""}
                onChange={(e) => updateField("embed_title", e.target.value)}
                placeholder="Ouvrir un ticket clan"
              />
            </Field>

            <div className="flex gap-3">
              <Field label="Couleur" className="w-32">
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={config.embed_color ?? "#7C3AED"}
                    onChange={(e) => updateField("embed_color", e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                  <input
                    className="input-glass font-mono text-xs"
                    value={config.embed_color ?? "#7C3AED"}
                    onChange={(e) => updateField("embed_color", e.target.value)}
                    placeholder="#7C3AED"
                  />
                </div>
              </Field>
            </div>

            <Field
              label="URL de la bannière"
              hint="Image affichée en haut de l'embed (optionnel)"
            >
              <input
                className="input-glass"
                value={config.banner_url ?? ""}
                onChange={(e) => updateField("banner_url", e.target.value)}
                placeholder="https://cdn.example.com/banner.png"
              />
            </Field>
          </Section>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {/* Save */}
            <div className="flex items-center gap-3">
              <button
                className="btn-primary flex items-center gap-2"
                onClick={handleSave}
                disabled={saving || !config.guild_id.trim()}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    Enregistrer
                  </>
                )}
              </button>

              {saveStatus === "saved" && (
                <span className="text-sm text-green-400 flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Enregistré
                </span>
              )}
              {saveStatus === "error" && (
                <span className="text-sm text-red-400">Erreur lors de l'enregistrement</span>
              )}
            </div>

            {/* Deploy */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(124,58,237,0.08)",
                border: "1px solid rgba(124,58,237,0.2)",
              }}
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl">🚀</div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">Déployer l'embed</p>
                  <p className="text-xs mt-1" style={{ color: "rgba(241,245,249,0.5)" }}>
                    {hasExistingEmbed
                      ? "Met à jour le message existant dans le salon configuré."
                      : "Envoie un nouveau message dans le salon configuré."}
                  </p>

                  {deployStatus === "no_channel" && (
                    <p className="text-xs mt-2 text-yellow-400">
                      ⚠️ Configure un salon d'embed avant de déployer.
                    </p>
                  )}
                  {deployStatus === "success" && (
                    <p className="text-xs mt-2 text-green-400 flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Signal envoyé au bot — l'embed va se {hasExistingEmbed ? "mettre à jour" : "poster"}.
                    </p>
                  )}
                  {deployStatus === "error" && (
                    <p className="text-xs mt-2 text-red-400">Erreur lors du déploiement.</p>
                  )}

                  <button
                    className="btn-primary mt-3 flex items-center gap-2"
                    onClick={handleDeploy}
                    disabled={deploying || !savedGuildId}
                  >
                    {deploying ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Déploiement...
                      </>
                    ) : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                        {hasExistingEmbed ? "Mettre à jour l'embed" : "Déployer l'embed"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="xl:col-span-2">
          <div className="glass p-5 sticky top-8">
            <p className="text-xs font-medium mb-4" style={{ color: "rgba(241,245,249,0.5)" }}>
              Aperçu de l'embed
            </p>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <EmbedPreview
                title={config.embed_title ?? "Ouvrir un ticket clan"}
                color={config.embed_color ?? "#7C3AED"}
                bannerUrl={config.banner_url ?? undefined}
                options={[]}
              />
            )}

            {/* Status embed */}
            {savedGuildId && (
              <div
                className="mt-4 px-3 py-2 rounded-xl flex items-center gap-2"
                style={{
                  background: hasExistingEmbed
                    ? "rgba(34,197,94,0.1)"
                    : "rgba(255,255,255,0.04)",
                  border: hasExistingEmbed
                    ? "1px solid rgba(34,197,94,0.2)"
                    : "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: hasExistingEmbed ? "#22c55e" : "rgba(241,245,249,0.3)",
                  }}
                />
                <p className="text-xs" style={{ color: "rgba(241,245,249,0.5)" }}>
                  {hasExistingEmbed
                    ? `Embed actif (message ID: ${config.message_id?.slice(0, 8)}...)`
                    : "Aucun embed déployé"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span>{icon}</span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label className="text-xs font-medium" style={{ color: "rgba(241,245,249,0.7)" }}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {hint && (
        <p className="text-xs" style={{ color: "rgba(241,245,249,0.3)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
