import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { config as configApi, guilds as guildsApi } from "@/lib/api";
import Card from "@/components/Card";
import Button from "@/components/Button";
import Loader from "@/components/Loader";
import ChannelSelect from "@/components/ChannelSelect";
import toast from "react-hot-toast";

const DEFAULT_ACCESS = "¡Felicidades! 🎉\n\nAhora tienes el rango **{rol}**.\n\nYa puedes hacer tus **publicaciones OOC** en los canales correspondientes.";
const DEFAULT_VIP    = "¡Felicidades! ⭐\n\nAhora tienes el rango **{rol}**.\n\nYa puedes acceder a los **canales VIP** exclusivos y usar el **@everyone moderadamente**.";
const DEFAULT_OTHER  = "¡Felicidades! 🎉\n\nSe te ha asignado el rango **{rol}**.\n\nDisfruta de tus nuevos privilegios.";

export default function DarRango() {
  const { guildId } = useParams();
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const [accessMsg,  setAccessMsg]  = useState(DEFAULT_ACCESS);
  const [vipMsg,     setVipMsg]     = useState(DEFAULT_VIP);
  const [defaultMsg, setDefaultMsg] = useState(DEFAULT_OTHER);
  const [logChannelId, setLogChannelId] = useState("");
  const [channels, setChannels] = useState<{ id: string; name: string; type: number; parentId: string | null }[]>([]);

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
      })
      .finally(() => setLoading(false));
  }, [guildId]);

  const save = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      await configApi.update(guildId, {
        darRangoAccessMessage:   accessMsg  || null,
        darRangoVipMessage:      vipMsg     || null,
        darRangoDefaultMessage:  defaultMsg || null,
        verificationLogChannelId: logChannelId || null,
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
            <ChannelSelect
              label="Canal de logs"
              description="Destino del registro de verificaciones"
              channels={channels}
              value={logChannelId}
              onChange={setLogChannelId}
            />
          </div>
        </Card>

        {/* Access message */}
        <Card title="Mensaje Access" description="DM enviado cuando el rol contiene access en su nombre">
          <div className="mt-3 space-y-2">
            <label className="text-sm text-discord-muted">Mensaje (soporta markdown de Discord)</label>
            <textarea
              className="w-full h-36 bg-discord-dark border border-discord-lighter/40 rounded-lg p-3 text-discord-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-discord-blurple/50 font-mono"
              value={accessMsg}
              onChange={(e) => setAccessMsg(e.target.value)}
              placeholder={DEFAULT_ACCESS}
            />
            <div className="p-3 rounded-lg bg-discord-darker border border-discord-lighter/20 text-sm">
              <p className="text-discord-muted text-xs mb-1">Vista previa:</p>
              <p className="text-discord-white whitespace-pre-wrap">
                <span className="text-discord-blurple font-medium">@Usuario </span>
                {accessMsg.replace(/\{rol\}/g, "Access")}
              </p>
            </div>
          </div>
        </Card>

        {/* VIP message */}
        <Card title="Mensaje VIP" description="DM enviado cuando el rol contiene vip en su nombre">
          <div className="mt-3 space-y-2">
            <label className="text-sm text-discord-muted">Mensaje (soporta markdown de Discord)</label>
            <textarea
              className="w-full h-36 bg-discord-dark border border-discord-lighter/40 rounded-lg p-3 text-discord-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-discord-blurple/50 font-mono"
              value={vipMsg}
              onChange={(e) => setVipMsg(e.target.value)}
              placeholder={DEFAULT_VIP}
            />
            <div className="p-3 rounded-lg bg-discord-darker border border-discord-lighter/20 text-sm">
              <p className="text-discord-muted text-xs mb-1">Vista previa:</p>
              <p className="text-discord-white whitespace-pre-wrap">
                <span className="text-discord-blurple font-medium">@Usuario </span>
                {vipMsg.replace(/\{rol\}/g, "VIP")}
              </p>
            </div>
          </div>
        </Card>

        {/* Default message */}
        <Card title="Mensaje por defecto" description="Enviado cuando el rol no es Access ni VIP">
          <div className="mt-3 space-y-2">
            <label className="text-sm text-discord-muted">Mensaje (soporta markdown de Discord)</label>
            <textarea
              className="w-full h-36 bg-discord-dark border border-discord-lighter/40 rounded-lg p-3 text-discord-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-discord-blurple/50 font-mono"
              value={defaultMsg}
              onChange={(e) => setDefaultMsg(e.target.value)}
              placeholder={DEFAULT_OTHER}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>Guardar cambios</Button>
        </div>
      </div>
    </div>
  );
}
