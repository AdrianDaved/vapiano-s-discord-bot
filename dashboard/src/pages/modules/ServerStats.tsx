import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { config as configApi, guilds as guildsApi } from "@/lib/api";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import toast from "react-hot-toast";
import { Plus, Trash2, BarChart2 } from "lucide-react";

interface StatChannel {
  id: string;
  channelId: string;
  type: string;
  format: string;
}

const STAT_TYPES = [
  { value: "members", label: "Total de miembros" },
  { value: "humans", label: "Miembros humanos" },
  { value: "bots", label: "Bots" },
  { value: "online", label: "En línea" },
  { value: "roles", label: "Roles" },
  { value: "channels", label: "Canales" },
  { value: "boosts", label: "Boosts" },
];

const FORMAT_EXAMPLES: Record<string, string> = {
  members: "👥 Miembros: {value}",
  humans: "🧑 Humanos: {value}",
  bots: "🤖 Bots: {value}",
  online: "🟢 En línea: {value}",
  roles: "🏷️ Roles: {value}",
  channels: "📢 Canales: {value}",
  boosts: "💎 Boosts: {value}",
};

function newStat(): StatChannel {
  return {
    id: crypto.randomUUID(),
    channelId: "",
    type: "members",
    format: FORMAT_EXAMPLES.members,
  };
}

export default function ServerStats() {
  const { guildId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  const [stats, setStats] = useState<StatChannel[]>([]);
  const [channels, setChannels] = useState<{ id: string; name: string; type: number; parentId: string | null }[]>([]);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    Promise.all([
      configApi.get(guildId),
      guildsApi.channels(guildId).catch(() => []),
    ])
      .then(([data, ch]) => {
        setStats((data.statsChannels as StatChannel[] | null) ?? []);
        setChannels(ch);
      })
      .finally(() => setLoading(false));
  }, [guildId]);

  const voiceChannels = channels.filter((c) => c.type === 2);

  const updateStat = (id: string, field: keyof StatChannel, value: string) => {
    setStats((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      const updated = { ...s, [field]: value };
      // Auto-fill format when type changes
      if (field === "type" && !s.format.trim()) {
        updated.format = FORMAT_EXAMPLES[value] ?? "{value}";
      }
      return updated;
    }));
  };

  const removeStat = (id: string) => setStats((prev) => prev.filter((s) => s.id !== id));

  const save = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      await configApi.update(guildId, {
        statsChannels: stats.length ? stats : null,
      });
      toast.success("Canales de estadísticas guardados");
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Cargando canales de estadísticas..." />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white flex items-center gap-2">
          <BarChart2 size={24} className="text-discord-blurple" /> Estadísticas del servidor
        </h1>
        <p className="text-discord-muted mt-1">
          Canales de voz que muestran estadísticas en tiempo real del servidor. Se actualizan cada 10 minutos.
          Usa <code className="text-yellow-400">{"{value}"}</code> para el valor actual.
        </p>
      </div>

      <div className="space-y-6">
        <Card title="Canales de estadísticas" description="Crea canales de voz con nombres dinámicos que muestran datos del servidor">
          <div className="mt-4 space-y-4">
            {stats.map((s) => (
              <div key={s.id} className="p-4 bg-discord-darker rounded-xl border border-discord-lighter/20 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-discord-muted block mb-1">Tipo de estadística</label>
                    <select
                      className="w-full bg-discord-dark border border-discord-lighter/40 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                      value={s.type}
                      onChange={(e) => updateStat(s.id, "type", e.target.value)}
                    >
                      {STAT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <button onClick={() => removeStat(s.id)} className="mt-5 text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>

                <div>
                  <label className="text-xs text-discord-muted block mb-1">Canal de voz</label>
                  <select
                    className="w-full bg-discord-dark border border-discord-lighter/40 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                    value={s.channelId}
                    onChange={(e) => updateStat(s.id, "channelId", e.target.value)}
                  >
                    <option value="">Seleccionar canal de voz...</option>
                    {voiceChannels.map((c) => (
                      <option key={c.id} value={c.id}>🔊 {c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-discord-muted block mb-1">Formato del nombre</label>
                  <input
                    className="w-full bg-discord-dark border border-discord-lighter/40 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                    value={s.format}
                    onChange={(e) => updateStat(s.id, "format", e.target.value)}
                    placeholder={FORMAT_EXAMPLES[s.type] ?? "{value}"}
                    maxLength={200}
                  />
                  <p className="text-xs text-discord-muted mt-1">
                    Vista previa: <span className="text-discord-white">{s.format.replace("{value}", "1,234")}</span>
                  </p>
                </div>
              </div>
            ))}

            <button
              onClick={() => setStats((prev) => [...prev, newStat()])}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-discord-lighter/30 text-discord-muted hover:border-discord-blurple/50 hover:text-discord-blurple transition-colors"
            >
              <Plus size={16} />
              <span className="text-sm">Agregar canal de estadísticas</span>
            </button>
          </div>
        </Card>

        {/* Info card */}
        <Card title="Cómo configurarlo" description="">
          <div className="mt-3 space-y-2 text-sm text-discord-muted">
            <p>1. Crea canales de voz en tu servidor (ej: "📊 Miembros: 0").</p>
            <p>2. Añade los canales aquí con el tipo de estadística que quieres mostrar.</p>
            <p>3. El bot necesita permiso de <strong className="text-discord-white">Gestionar canal</strong> en esos canales de voz.</p>
            <p>4. El nombre se actualiza automáticamente cada <strong className="text-discord-white">10 minutos</strong>.</p>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>Guardar cambios</Button>
        </div>
      </div>
    </div>
  );
}
