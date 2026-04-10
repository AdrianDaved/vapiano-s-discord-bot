import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { config as configApi, guilds as guildsApi } from "@/lib/api";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import ChannelSelect from "@/components/ChannelSelect";
import toast from "react-hot-toast";
import { Plus, Trash2, GripVertical } from "lucide-react";

const DEFAULT_ACCESS = "¡Felicidades! 🎉\n\nAhora tienes el rango **{rol}**.\n\nYa puedes hacer tus **publicaciones OOC** en los canales correspondientes.";
const DEFAULT_VIP    = "¡Felicidades! ⭐\n\nAhora tienes el rango **{rol}**.\n\nYa puedes acceder a los **canales VIP** exclusivos y usar el **@everyone moderadamente**.";
const DEFAULT_OTHER  = "¡Felicidades! 🎉\n\nSe te ha asignado el rango **{rol}**.\n\nDisfruta de tus nuevos privilegios.";

interface RolePattern {
  id: string;
  pattern: string;
  emoji: string;
  message: string;
}

function newPattern(): RolePattern {
  return { id: crypto.randomUUID(), pattern: "", emoji: "🎖️", message: DEFAULT_OTHER };
}

export default function DarRango() {
  const { guildId } = useParams();
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const [accessMsg,  setAccessMsg]  = useState(DEFAULT_ACCESS);
  const [vipMsg,     setVipMsg]     = useState(DEFAULT_VIP);
  const [defaultMsg, setDefaultMsg] = useState(DEFAULT_OTHER);
  const [logChannelId, setLogChannelId] = useState("");
  const [channels, setChannels] = useState<{ id: string; name: string; type: number; parentId: string | null }[]>([]);
  const [roles, setRoles] = useState<RolePattern[]>([]);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    Promise.all([
      configApi.get(guildId),
      guildsApi.channels(guildId).catch(() => []),
    ])
      .then(([data, ch]) => {
        setAccessMsg(data.darRangoAccessMessage  ?? DEFAULT_ACCESS);
        setVipMsg(data.darRangoVipMessage        ?? DEFAULT_VIP);
        setDefaultMsg(data.darRangoDefaultMessage ?? DEFAULT_OTHER);
        setLogChannelId(data.verificationLogChannelId ?? "");
        setChannels(ch);
        setRoles((data.darRangoRoles as RolePattern[] | null) ?? []);
      })
      .finally(() => setLoading(false));
  }, [guildId]);

  const updateRole = (id: string, field: keyof RolePattern, value: string) => {
    setRoles((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRole = (id: string) => setRoles((prev) => prev.filter((r) => r.id !== id));

  const save = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      await configApi.update(guildId, {
        darRangoAccessMessage:    accessMsg  || null,
        darRangoVipMessage:       vipMsg     || null,
        darRangoDefaultMessage:   defaultMsg || null,
        verificationLogChannelId: logChannelId || null,
        darRangoRoles:            roles.length ? roles : null,
      });
      toast.success("Configuración de /dar-rango guardada");
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Cargando configuración de dar-rango..." />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Dar Rango</h1>
        <p className="text-discord-muted mt-1">
          Configura los mensajes DM del comando <code className="text-discord-blurple">/dar-rango</code> y el canal de registro.
          Usa <code className="text-yellow-400">{"{rol}"}</code> para insertar el nombre del rol automáticamente.
        </p>
      </div>

      <div className="space-y-6">
        {/* Log channel */}
        <Card title="Canal de registro" description="Canal donde se envían los logs de /dar-rango con ID, supa y transcripción">
          <div className="mt-3">
            <ChannelSelect channels={channels} value={logChannelId} onChange={setLogChannelId} />
          </div>
        </Card>

        {/* Dynamic role patterns */}
        <Card title="Patrones de rol personalizados" description="El bot buscará el patrón en el nombre del rol (sin distinción de mayúsculas) y usará el mensaje correspondiente.">
          <div className="mt-4 space-y-4">
            {roles.map((r) => (
              <div key={r.id} className="bg-discord-darker rounded-xl p-4 border border-discord-lighter/20">
                <div className="flex items-start gap-3">
                  <GripVertical className="text-discord-muted mt-1 shrink-0" size={16} />
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-3">
                      <div className="w-20">
                        <label className="text-xs text-discord-muted block mb-1">Emoji</label>
                        <input
                          className="w-full bg-discord-dark border border-discord-lighter/40 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:ring-2 focus:ring-discord-blurple/50 text-center"
                          value={r.emoji}
                          onChange={(e) => updateRole(r.id, "emoji", e.target.value)}
                          maxLength={8}
                          placeholder="🎖️"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-discord-muted block mb-1">Patrón (texto en el nombre del rol)</label>
                        <input
                          className="w-full bg-discord-dark border border-discord-lighter/40 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                          value={r.pattern}
                          onChange={(e) => updateRole(r.id, "pattern", e.target.value)}
                          placeholder="ej: moderador, staff, nitro..."
                        />
                      </div>
                      <button
                        onClick={() => removeRole(r.id)}
                        className="mt-5 text-red-400 hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div>
                      <label className="text-xs text-discord-muted block mb-1">Mensaje DM</label>
                      <textarea
                        className="w-full h-28 bg-discord-dark border border-discord-lighter/40 rounded-lg p-3 text-discord-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-discord-blurple/50 font-mono"
                        value={r.message}
                        onChange={(e) => updateRole(r.id, "message", e.target.value)}
                        placeholder="Mensaje a enviar... usa {rol} para el nombre del rol"
                      />
                    </div>
                    {r.pattern && (
                      <div className="p-3 rounded-lg bg-discord-dark border border-discord-lighter/20 text-sm">
                        <p className="text-discord-muted text-xs mb-1">Vista previa (para rol que contiene "{r.pattern}"):</p>
                        <p className="text-discord-white whitespace-pre-wrap text-xs">
                          <span className="text-discord-blurple font-medium">@Usuario </span>
                          {r.message.replace(/\{rol\}/g, r.pattern)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => setRoles((prev) => [...prev, newPattern()])}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-discord-lighter/30 text-discord-muted hover:border-discord-blurple/50 hover:text-discord-blurple transition-colors"
            >
              <Plus size={16} />
              <span className="text-sm">Agregar patrón de rol</span>
            </button>
          </div>
        </Card>

        {/* Legacy fallback messages */}
        <Card title="Mensajes de respaldo" description="Se usan si el rol no coincide con ningún patrón personalizado de arriba.">
          <div className="mt-4 space-y-5">
            <div>
              <label className="text-sm font-medium text-discord-white block mb-1">Access (rol contiene "access")</label>
              <textarea
                className="w-full h-32 bg-discord-dark border border-discord-lighter/40 rounded-lg p-3 text-discord-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-discord-blurple/50 font-mono"
                value={accessMsg}
                onChange={(e) => setAccessMsg(e.target.value)}
                placeholder={DEFAULT_ACCESS}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-discord-white block mb-1">VIP (rol contiene "vip")</label>
              <textarea
                className="w-full h-32 bg-discord-dark border border-discord-lighter/40 rounded-lg p-3 text-discord-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-discord-blurple/50 font-mono"
                value={vipMsg}
                onChange={(e) => setVipMsg(e.target.value)}
                placeholder={DEFAULT_VIP}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-discord-white block mb-1">Por defecto</label>
              <textarea
                className="w-full h-32 bg-discord-dark border border-discord-lighter/40 rounded-lg p-3 text-discord-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-discord-blurple/50 font-mono"
                value={defaultMsg}
                onChange={(e) => setDefaultMsg(e.target.value)}
                placeholder={DEFAULT_OTHER}
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>Guardar cambios</Button>
        </div>
      </div>
    </div>
  );
}
