import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { config as configApi, guilds as guildsApi } from "@/lib/api";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import ChannelSelect from "@/components/ChannelSelect";
import toast from "react-hot-toast";
import { Plus, Trash2, Trophy, Zap, Clock, Star } from "lucide-react";

interface LevelRole {
  level: number;
  roleId: string;
}

const DEFAULT_LEVELUP = "🎉 {user} ¡subió al nivel **{level}**!";

export default function Levels() {
  const { guildId } = useParams();
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const [enabled, setEnabled]           = useState(false);
  const [xpPerMsg, setXpPerMsg]         = useState(15);
  const [cooldown, setCooldown]         = useState(60);
  const [levelUpChannelId, setLevelUpChannelId] = useState("");
  const [levelUpMessage, setLevelUpMessage]     = useState(DEFAULT_LEVELUP);
  const [levelRoles, setLevelRoles]     = useState<LevelRole[]>([]);
  const [ignoredChannels, setIgnoredChannels]   = useState<string[]>([]);
  const [channels, setChannels] = useState<{ id: string; name: string; type: number; parentId: string | null }[]>([]);
  const [guildRoles, setGuildRoles] = useState<{ id: string; name: string; color: number }[]>([]);
  const [leaderboard, setLeaderboard] = useState<{ userId: string; xp: number; level: number; messages: number }[]>([]);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    Promise.all([
      configApi.get(guildId),
      guildsApi.channels(guildId).catch(() => []),
      guildsApi.roles(guildId).catch(() => []),
      fetch(`/api/guilds/${guildId}/levels/leaderboard?limit=10`, { credentials: "include" })
        .then((r) => r.json()).catch(() => []),
    ])
      .then(([data, ch, roles, lb]) => {
        setEnabled(data.levelsEnabled ?? false);
        setXpPerMsg(data.xpPerMessage ?? 15);
        setCooldown(data.xpCooldownSeconds ?? 60);
        setLevelUpChannelId(data.levelUpChannelId ?? "");
        setLevelUpMessage(data.levelUpMessage ?? DEFAULT_LEVELUP);
        setLevelRoles((data.levelRoles as LevelRole[] | null) ?? []);
        setIgnoredChannels((data.levelIgnoredChannels as string[]) ?? []);
        setChannels(ch);
        setGuildRoles(roles);
        setLeaderboard(Array.isArray(lb) ? lb : []);
      })
      .finally(() => setLoading(false));
  }, [guildId]);

  const toggleIgnoredChannel = (id: string) => {
    setIgnoredChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const addLevelRole = () => setLevelRoles((prev) => [...prev, { level: 1, roleId: "" }]);
  const removeLevelRole = (idx: number) => setLevelRoles((prev) => prev.filter((_, i) => i !== idx));
  const updateLevelRole = (idx: number, field: keyof LevelRole, value: string | number) => {
    setLevelRoles((prev) => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const save = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      await configApi.update(guildId, {
        levelsEnabled: enabled,
        xpPerMessage: xpPerMsg,
        xpCooldownSeconds: cooldown,
        levelUpChannelId: levelUpChannelId || null,
        levelUpMessage: levelUpMessage || null,
        levelRoles: levelRoles.filter((r) => r.roleId),
        levelIgnoredChannels: ignoredChannels,
      });
      toast.success("Configuración de niveles guardada");
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const textChannels = channels.filter((c) => c.type === 0);

  if (loading) return <Loader text="Cargando sistema de niveles..." />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white flex items-center gap-2">
          <Trophy size={24} className="text-yellow-400" /> Sistema de Niveles
        </h1>
        <p className="text-discord-muted mt-1">
          Gana XP por enviar mensajes y sube de nivel. Configura recompensas de roles y mensajes automáticos.
        </p>
      </div>

      <div className="space-y-6">
        {/* Enable toggle */}
        <Card title="Estado del sistema" description="Activa o desactiva el sistema de XP y niveles para este servidor">
          <div className="mt-4 flex items-center justify-between p-4 bg-discord-darker rounded-xl">
            <div className="flex items-center gap-3">
              <Zap size={20} className={enabled ? "text-yellow-400" : "text-discord-muted"} />
              <div>
                <p className="text-discord-white font-medium">Sistema de niveles</p>
                <p className="text-discord-muted text-sm">{enabled ? "Activo — los usuarios ganan XP por mensajes" : "Desactivado"}</p>
              </div>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? "bg-discord-blurple" : "bg-discord-lighter"}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : ""}`} />
            </button>
          </div>
        </Card>

        {/* XP settings */}
        <Card title="Configuración de XP" description="Controla cuánto XP ganan los usuarios y con qué frecuencia">
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-discord-muted block mb-2 flex items-center gap-1">
                <Zap size={14} /> XP por mensaje
              </label>
              <input
                type="number" min={1} max={1000}
                className="w-full bg-discord-dark border border-discord-lighter/40 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                value={xpPerMsg}
                onChange={(e) => setXpPerMsg(Number(e.target.value))}
              />
              <p className="text-xs text-discord-muted mt-1">Entre 1 y 1000 XP por mensaje</p>
            </div>
            <div>
              <label className="text-sm text-discord-muted block mb-2 flex items-center gap-1">
                <Clock size={14} /> Cooldown (segundos)
              </label>
              <input
                type="number" min={0} max={3600}
                className="w-full bg-discord-dark border border-discord-lighter/40 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                value={cooldown}
                onChange={(e) => setCooldown(Number(e.target.value))}
              />
              <p className="text-xs text-discord-muted mt-1">Tiempo entre ganancias de XP por usuario</p>
            </div>
          </div>

          {/* XP formula info */}
          <div className="mt-4 p-3 rounded-xl bg-discord-darker border border-discord-lighter/20 text-sm">
            <p className="text-discord-muted text-xs mb-1">Fórmula de XP por nivel:</p>
            <p className="text-discord-white font-mono text-xs">XP(n) = 5n² + 50n + 100</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[1,5,10,20,50].map((lvl) => {
                const xpNeeded = 5 * lvl * lvl + 50 * lvl + 100;
                return (
                  <span key={lvl} className="px-2 py-1 rounded-lg bg-discord-dark text-xs text-discord-muted">
                    Nv.{lvl}: <span className="text-yellow-400">{xpNeeded.toLocaleString()} XP</span>
                  </span>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Level up message */}
        <Card title="Mensaje de subida de nivel" description="Mensaje enviado cuando un usuario sube de nivel. Usa {user} y {level}.">
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm text-discord-muted block mb-1">Canal de anuncio</label>
              <ChannelSelect
                channels={textChannels}
                value={levelUpChannelId}
                onChange={setLevelUpChannelId}
                placeholder="Canal actual del mensaje"
              />
            </div>
            <div>
              <label className="text-sm text-discord-muted block mb-1">Mensaje</label>
              <input
                className="w-full bg-discord-dark border border-discord-lighter/40 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                value={levelUpMessage}
                onChange={(e) => setLevelUpMessage(e.target.value)}
                placeholder={DEFAULT_LEVELUP}
                maxLength={500}
              />
            </div>
            <div className="p-3 rounded-lg bg-discord-darker border border-discord-lighter/20 text-sm">
              <p className="text-discord-muted text-xs mb-1">Vista previa:</p>
              <p className="text-discord-white">
                {levelUpMessage.replace("{user}", "@TuNombre").replace("{level}", "5")}
              </p>
            </div>
          </div>
        </Card>

        {/* Level roles */}
        <Card title="Roles por nivel" description="Asigna automáticamente un rol cuando el usuario alcanza un nivel específico">
          <div className="mt-4 space-y-3">
            {levelRoles.map((lr, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-discord-darker rounded-xl">
                <Star size={16} className="text-yellow-400 shrink-0" />
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-discord-muted text-sm">Nivel</span>
                  <input
                    type="number" min={1} max={999}
                    className="w-20 bg-discord-dark border border-discord-lighter/40 rounded-lg px-2 py-1 text-discord-white text-sm focus:outline-none"
                    value={lr.level}
                    onChange={(e) => updateLevelRole(idx, "level", Number(e.target.value))}
                  />
                  <span className="text-discord-muted text-sm">→ Rol</span>
                  <select
                    className="flex-1 bg-discord-dark border border-discord-lighter/40 rounded-lg px-2 py-1 text-discord-white text-sm focus:outline-none"
                    value={lr.roleId}
                    onChange={(e) => updateLevelRole(idx, "roleId", e.target.value)}
                  >
                    <option value="">Seleccionar rol...</option>
                    {guildRoles.filter((r) => r.name !== "@everyone").map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => removeLevelRole(idx)} className="text-red-400 hover:text-red-300">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={addLevelRole}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-discord-lighter/30 text-discord-muted hover:border-discord-blurple/50 hover:text-discord-blurple transition-colors"
            >
              <Plus size={16} />
              <span className="text-sm">Agregar recompensa de rol</span>
            </button>
          </div>
        </Card>

        {/* Ignored channels */}
        <Card title="Canales ignorados" description="Los mensajes en estos canales no darán XP">
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {textChannels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => toggleIgnoredChannel(ch.id)}
                className={`px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  ignoredChannels.includes(ch.id)
                    ? "bg-red-500/20 border border-red-500/40 text-red-300"
                    : "bg-discord-darker border border-discord-lighter/20 text-discord-muted hover:text-discord-white"
                }`}
              >
                # {ch.name}
              </button>
            ))}
          </div>
        </Card>

        {/* Leaderboard preview */}
        {leaderboard.length > 0 && (
          <Card title="Top 10 — Clasificación actual" description="Los usuarios con más XP en este servidor">
            <div className="mt-4 space-y-2">
              {leaderboard.map((entry, idx) => (
                <div key={entry.userId} className="flex items-center gap-3 p-3 bg-discord-darker rounded-xl">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    idx === 0 ? "bg-yellow-500 text-black" :
                    idx === 1 ? "bg-gray-400 text-black" :
                    idx === 2 ? "bg-amber-600 text-black" :
                    "bg-discord-dark text-discord-muted"
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-discord-white text-sm font-mono">{entry.userId}</p>
                    <div className="flex gap-3 text-xs text-discord-muted mt-0.5">
                      <span>Nv. <span className="text-discord-blurple font-medium">{entry.level}</span></span>
                      <span><span className="text-yellow-400">{entry.xp.toLocaleString()}</span> XP</span>
                      <span>{entry.messages.toLocaleString()} mensajes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>Guardar cambios</Button>
        </div>
      </div>
    </div>
  );
}
