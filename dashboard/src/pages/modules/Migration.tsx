/**
 * Migration — Copy configuration between servers.
 * Allows selecting sections and ticket panels to migrate.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { config as configApi, guilds as guildsApi, tickets as ticketsApi } from "@/lib/api";
import Card from "@/components/Card";
import Button from "@/components/Button";
import ChannelSelect from "@/components/ChannelSelect";
import Loader from "@/components/Loader";
import toast from "react-hot-toast";
import { ArrowRight, ArrowLeftRight, Copy, CheckCircle2, AlertCircle } from "lucide-react";

// Sections available for migration
const CONFIG_SECTIONS = [
  { key: "general",     label: "General",        desc: "Prefijo, idioma, rol de silencio",                color: "text-discord-blurple" },
  { key: "tickets",     label: "Tickets (config)", desc: "Config general: categorías, canales de log, roles de staff", color: "text-discord-blurple" },
  { key: "welcome",     label: "Bienvenida",      desc: "Mensajes de entrada/salida, roles automáticos",   color: "text-discord-green" },
  { key: "logging",     label: "Registros",       desc: "Canales de log de moderación, mensajes y voz",    color: "text-yellow-400" },
  { key: "automod",     label: "AutoMod",         desc: "Anti-spam, palabras prohibidas, filtros",         color: "text-discord-red" },
  { key: "moderation",  label: "Moderación",      desc: "Canal de log de moderación",                     color: "text-orange-400" },
  { key: "suggestions", label: "Sugerencias",     desc: "Canal de sugerencias",                            color: "text-purple-400" },
  { key: "reputation",  label: "Reputación",      desc: "Canal de reputación",                             color: "text-pink-400" },
];

interface GuildPanel {
  id: string;
  name: string;
  title: string;
  description: string;
  channelId: string;
  buttonLabel: string;
  buttonColor: string;
  buttonEmoji?: string;
  embedColor?: string;
  groupEmbedTitle?: string;
  groupEmbedDescription?: string;
  groupEmbedColor?: string;
  [key: string]: any;
}

interface MigratedResult {
  sections: string[];
  panels: string[];
  fieldsCount: number;
}

export default function Migration() {
  const { guildId } = useParams<{ guildId: string }>();
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);

  // Guilds
  const [otherGuilds, setOtherGuilds] = useState<{ id: string; name: string; icon: string | null; botPresent: boolean }[]>([]);
  const [targetGuildId, setTargetGuildId] = useState("");

  // Target guild channels (for panel deployment)
  const [targetChannels, setTargetChannels] = useState<{ id: string; name: string; type: number; parentId: string | null }[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [targetChannelId, setTargetChannelId] = useState("");

  // Section selection
  const [selectedSections, setSelectedSections] = useState<string[]>([]);

  // Panel migration
  const [sourcePanels, setSourcePanels] = useState<GuildPanel[]>([]);
  const [selectedPanels, setSelectedPanels] = useState<string[]>([]);

  // Result
  const [lastResult, setLastResult] = useState<MigratedResult | null>(null);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    Promise.all([
      guildsApi.list().catch(() => []),
      ticketsApi.panels(guildId).catch(() => []),
    ]).then(([guilds, panels]) => {
      setOtherGuilds((guilds as any[]).filter((g: any) => g.botPresent && g.id !== guildId));
      setSourcePanels(panels as GuildPanel[]);
    }).finally(() => setLoading(false));
  }, [guildId]);

  // Load target guild channels when target guild changes
  useEffect(() => {
    if (!targetGuildId) {
      setTargetChannels([]);
      setTargetChannelId("");
      return;
    }
    setLoadingChannels(true);
    setTargetChannelId("");
    guildsApi.channels(targetGuildId)
      .then((ch: any[]) => setTargetChannels(ch || []))
      .catch(() => setTargetChannels([]))
      .finally(() => setLoadingChannels(false));
  }, [targetGuildId]);

  const toggleSection = (key: string) => {
    setSelectedSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const togglePanel = (id: string) => {
    setSelectedPanels((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedSections(CONFIG_SECTIONS.map((s) => s.key));
  const clearAll = () => setSelectedSections([]);

  const migrate = async () => {
    if (!guildId || !targetGuildId) {
      toast.error("Selecciona un servidor destino");
      return;
    }
    if (selectedSections.length === 0 && selectedPanels.length === 0) {
      toast.error("Selecciona al menos una sección o panel para migrar");
      return;
    }
    if (selectedPanels.length > 0 && !targetChannelId) {
      toast.error("Selecciona el canal destino donde desplegar los paneles de tickets");
      return;
    }

    setMigrating(true);
    try {
      let fieldsCount = 0;

      // Migrate config sections
      if (selectedSections.length > 0) {
        const res = await configApi.clone(guildId, targetGuildId, selectedSections);
        fieldsCount += res.cloned ?? 0;
      }

      // Migrate + deploy ticket panels via cross-deploy
      let migratedPanelNames: string[] = [];
      if (selectedPanels.length > 0) {
        const firstPanel = sourcePanels.find((p) => p.id === selectedPanels[0]);
        const res = await ticketsApi.crossDeploy(guildId, {
          sourcePanelIds: selectedPanels,
          targetGuildId,
          channelId: targetChannelId,
          embedTitle: firstPanel?.groupEmbedTitle || "Sistema de Tickets",
          embedDescription: firstPanel?.groupEmbedDescription || "",
          embedColor: firstPanel?.groupEmbedColor || "#5865F2",
        });
        migratedPanelNames = selectedPanels
          .map((id) => sourcePanels.find((p) => p.id === id)?.name)
          .filter(Boolean) as string[];
        fieldsCount += res.panelCount ?? selectedPanels.length;
      }

      setLastResult({
        sections: selectedSections,
        panels: migratedPanelNames,
        fieldsCount,
      });

      const target = otherGuilds.find((g) => g.id === targetGuildId);
      toast.success(`Migración completada → ${target?.name ?? targetGuildId} (${fieldsCount} elementos)`);
    } catch (err: any) {
      toast.error(err.message || "Error durante la migración");
    } finally {
      setMigrating(false);
    }
  };

  if (loading) return <Loader text="Cargando datos de migración..." />;

  const targetGuild = otherGuilds.find((g) => g.id === targetGuildId);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white flex items-center gap-2">
          <ArrowLeftRight size={24} className="text-discord-blurple" />
          Migración de configuración
        </h1>
        <p className="text-discord-muted mt-1">
          Copia la configuración de este servidor a otro servidor donde tienes el bot
        </p>
      </div>

      <div className="space-y-6">

        {/* Server selector */}
        <Card title="Servidor destino" description="Elige a qué servidor quieres copiar la configuración">
          {otherGuilds.length === 0 ? (
            <p className="text-discord-muted text-sm py-3">No hay otros servidores con el bot disponibles.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {otherGuilds.map((guild) => (
                <button
                  key={guild.id}
                  onClick={() => setTargetGuildId(guild.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    targetGuildId === guild.id
                      ? "border-discord-blurple bg-discord-blurple/10"
                      : "border-discord-lighter/20 bg-discord-darker hover:border-discord-lighter/40"
                  }`}
                >
                  {guild.icon ? (
                    <img
                      src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=48`}
                      alt=""
                      className="w-10 h-10 rounded-xl flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-discord-lighter flex items-center justify-center text-xs font-bold text-discord-white flex-shrink-0">
                      {guild.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-discord-white truncate">{guild.name}</p>
                    <p className="text-xs text-discord-muted truncate">{guild.id}</p>
                  </div>
                  {targetGuildId === guild.id && (
                    <CheckCircle2 size={18} className="text-discord-blurple flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Direction indicator */}
        {targetGuild && (
          <div className="flex items-center justify-center gap-3 py-2 text-discord-muted text-sm">
            <span className="font-medium text-discord-white">Este servidor</span>
            <ArrowRight size={18} className="text-discord-blurple" />
            <span className="font-medium text-discord-white">{targetGuild.name}</span>
          </div>
        )}

        {/* Config sections */}
        <Card
          title="Secciones de configuración"
          description="Elige qué partes de la configuración quieres copiar"
          action={
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-discord-blurple hover:underline">Todas</button>
              <span className="text-discord-muted text-xs">·</span>
              <button onClick={clearAll} className="text-xs text-discord-muted hover:text-discord-white">Ninguna</button>
            </div>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {CONFIG_SECTIONS.map((section) => (
              <button
                key={section.key}
                onClick={() => toggleSection(section.key)}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-all text-left ${
                  selectedSections.includes(section.key)
                    ? "border-discord-blurple bg-discord-blurple/10"
                    : "border-discord-lighter/20 bg-discord-darker hover:border-discord-lighter/40"
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                  selectedSections.includes(section.key)
                    ? "bg-discord-blurple border-discord-blurple"
                    : "border-discord-lighter/40"
                }`}>
                  {selectedSections.includes(section.key) && (
                    <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className={`text-sm font-medium ${section.color}`}>{section.label}</p>
                  <p className="text-xs text-discord-muted mt-0.5">{section.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Ticket panels */}
        {sourcePanels.length > 0 && (
          <Card title="Paneles de tickets" description="Copia y despliega paneles de tickets en el servidor destino">
            <div className="space-y-2 mt-3">
              {sourcePanels.map((panel) => (
                <button
                  key={panel.id}
                  onClick={() => togglePanel(panel.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    selectedPanels.includes(panel.id)
                      ? "border-discord-blurple bg-discord-blurple/10"
                      : "border-discord-lighter/20 bg-discord-darker hover:border-discord-lighter/40"
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                    selectedPanels.includes(panel.id)
                      ? "bg-discord-blurple border-discord-blurple"
                      : "border-discord-lighter/40"
                  }`}>
                    {selectedPanels.includes(panel.id) && (
                      <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                        <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-discord-white">{panel.name}</p>
                    <p className="text-xs text-discord-muted">{panel.title} · Botón: {panel.buttonLabel}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    panel.buttonColor === "Success" ? "bg-green-500/20 text-green-400" :
                    panel.buttonColor === "Danger" ? "bg-red-500/20 text-red-400" :
                    panel.buttonColor === "Primary" ? "bg-discord-blurple/20 text-discord-blurple" :
                    "bg-discord-lighter/20 text-discord-muted"
                  }`}>{panel.buttonColor}</span>
                </button>
              ))}
            </div>

            {/* Channel selector for panel deployment */}
            {selectedPanels.length > 0 && targetGuildId && (
              <div className="mt-4 pt-4 border-t border-discord-lighter/20">
                {loadingChannels ? (
                  <p className="text-xs text-discord-muted">Cargando canales de {targetGuild?.name}...</p>
                ) : (
                  <ChannelSelect
                    label={`Canal destino en ${targetGuild?.name ?? "servidor destino"}`}
                    description="Los paneles seleccionados se crearán y desplegarán en este canal"
                    channels={targetChannels}
                    value={targetChannelId}
                    onChange={setTargetChannelId}
                    placeholder="Selecciona un canal..."
                  />
                )}
              </div>
            )}

            {selectedPanels.length > 0 && !targetGuildId && (
              <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex gap-2">
                  <AlertCircle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-400">
                    Selecciona primero un servidor destino para elegir el canal de despliegue.
                  </p>
                </div>
              </div>
            )}

            {selectedPanels.length > 0 && targetGuildId && !targetChannelId && !loadingChannels && (
              <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <div className="flex gap-2">
                  <AlertCircle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-400">
                    Debes seleccionar un canal destino para desplegar los paneles. Los roles de staff se limpiarán — reconfigúralos después.
                  </p>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Last result */}
        {lastResult && (
          <Card title="Última migración realizada">
            <div className="mt-3 space-y-2">
              {lastResult.sections.length > 0 && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-discord-green flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-discord-muted">
                    Secciones: <span className="text-discord-white">{lastResult.sections.join(", ")}</span>
                  </p>
                </div>
              )}
              {lastResult.panels.length > 0 && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-discord-green flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-discord-muted">
                    Paneles desplegados: <span className="text-discord-white">{lastResult.panels.join(", ")}</span>
                  </p>
                </div>
              )}
              <p className="text-xs text-discord-muted">{lastResult.fieldsCount} elementos migrados en total</p>
            </div>
          </Card>
        )}

        {/* Action */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-discord-muted">
            {selectedSections.length + selectedPanels.length === 0
              ? "Selecciona secciones o paneles para migrar"
              : `${selectedSections.length} sección(es) + ${selectedPanels.length} panel(es) seleccionado(s)`}
          </p>
          <Button
            onClick={migrate}
            loading={migrating}
            disabled={!targetGuildId || (selectedSections.length === 0 && selectedPanels.length === 0)}
          >
            <Copy size={14} />
            {targetGuild ? `Migrar → ${targetGuild.name}` : "Migrar configuración"}
          </Button>
        </div>

      </div>
    </div>
  );
}
