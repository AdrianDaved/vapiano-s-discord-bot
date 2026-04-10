import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { logging as loggingApi, config as configApi, guilds as guildsApi } from '@/lib/api';
import Card from '@/components/Card';
import Toggle from '@/components/Toggle';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import ChannelSelect from '@/components/ChannelSelect';
import toast from 'react-hot-toast';

export default function Logging() {
  const { guildId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [guildChannels, setGuildChannels] = useState<{ id: string; name: string; type: number; parentId: string | null }[]>([]);

  const [loggingEnabled, setLoggingEnabled] = useState(false);
  const [modLogChannelId, setModLogChannelId] = useState('');
  const [warnLogChannelId, setWarnLogChannelId] = useState('');
  const [messageLogChannelId, setMessageLogChannelId] = useState('');
  const [joinLeaveLogChannelId, setJoinLeaveLogChannelId] = useState('');
  const [auditLogChannelId, setAuditLogChannelId] = useState('');
  const [voiceLogChannelId, setVoiceLogChannelId] = useState('');
  const [verificationLogChannelId, setVerificationLogChannelId] = useState('');

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      loggingApi.get(guildId),
      guildsApi.channels(guildId).catch(() => []),
    ])
      .then(([data, channels]) => {
        setLoggingEnabled(data.loggingEnabled ?? false);
        setModLogChannelId(data.modLogChannelId ?? '');
        setWarnLogChannelId(data.warnLogChannelId ?? '');
        setMessageLogChannelId(data.messageLogChannelId ?? '');
        setJoinLeaveLogChannelId(data.joinLeaveLogChannelId ?? '');
        setAuditLogChannelId(data.auditLogChannelId ?? '');
        setVoiceLogChannelId(data.voiceLogChannelId ?? '');
        setVerificationLogChannelId(data.verificationLogChannelId ?? '');
        setGuildChannels(channels);
      })
      .catch((err) => setError(err.message || 'No se pudo cargar la configuracion de registros'))
      .finally(() => setLoading(false));
  }, [guildId, retryCount]);

  const save = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      await loggingApi.update(guildId, {
        modLogChannelId: modLogChannelId || null,
        warnLogChannelId: warnLogChannelId || null,
        messageLogChannelId: messageLogChannelId || null,
        joinLeaveLogChannelId: joinLeaveLogChannelId || null,
        auditLogChannelId: auditLogChannelId || null,
        voiceLogChannelId: voiceLogChannelId || null,
        verificationLogChannelId: verificationLogChannelId || null,
      });
      toast.success('Configuracion de registros guardada');
    } catch {
      toast.error('No se pudo guardar la configuracion');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Cargando configuracion de registros..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-discord-red text-lg font-semibold mb-2">No se pudo cargar la configuracion de registros</p>
        <p className="text-discord-muted text-sm mb-4">{error}</p>
        <button onClick={() => setRetryCount((c) => c + 1)} className="px-4 py-2 bg-discord-blurple text-white rounded-lg text-sm hover:bg-discord-blurple/80 transition-colors">Reintentar</button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Registros</h1>
        <p className="text-discord-muted mt-1">Configura donde se registran diferentes eventos del servidor</p>
      </div>

      <div className="space-y-6">
        <Card title="General">
          <div className="mt-3">
            <Toggle
              label="Activar registros"
              description="Interruptor principal para todo registro de eventos del servidor (cambios de rol/canal/voz)"
              enabled={loggingEnabled}
              onChange={(v) => {
                setLoggingEnabled(v);
                if (guildId) configApi.update(guildId, { loggingEnabled: v }).then(
                  () => toast.success(`Registros ${v ? 'activados' : 'desactivados'}`),
                  () => toast.error('No se pudo actualizar'),
                );
              }}
            />
          </div>
        </Card>

        {/* Moderación */}
        <Card title="Moderación" description="Registro de acciones de moderación como baneos, expulsiones y silencios">
          <div className="mt-3 space-y-1">
            <ChannelSelect
              label="Canal de registro de moderación"
              description="Baneos, expulsiones, silencios"
              channels={guildChannels}
              value={modLogChannelId}
              onChange={setModLogChannelId}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['ban','kick','mute','unban','unmute'].map(ev => (
                <span key={ev} className="text-xs px-2 py-0.5 rounded-full bg-discord-red/10 text-discord-red border border-discord-red/20">{ev}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* Advertencias */}
        <Card title="Advertencias" description="Canal dedicado para el registro de advertencias (si no se configura, se usa el canal de moderación)">
          <div className="mt-3 space-y-1">
            <ChannelSelect
              label="Canal de registro de advertencias"
              description="Advertencias emitidas por el comando /mod advertir"
              channels={guildChannels}
              value={warnLogChannelId}
              onChange={setWarnLogChannelId}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['warn'].map(ev => (
                <span key={ev} className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">{ev}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* Mensajes */}
        <Card title="Mensajes" description="Registro de ediciones y eliminaciones de mensajes">
          <div className="mt-3 space-y-1">
            <ChannelSelect
              label="Canal de registro de mensajes"
              description="Ediciones y eliminaciones de mensajes"
              channels={guildChannels}
              value={messageLogChannelId}
              onChange={setMessageLogChannelId}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['message_delete','message_edit','bulk_delete'].map(ev => (
                <span key={ev} className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">{ev}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* Miembros */}
        <Card title="Miembros" description="Registro de entradas y salidas de miembros">
          <div className="mt-3 space-y-1">
            <ChannelSelect
              label="Canal de registro de entradas/salidas"
              description="Entradas y salidas de miembros"
              channels={guildChannels}
              value={joinLeaveLogChannelId}
              onChange={setJoinLeaveLogChannelId}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['member_join','member_leave','member_update'].map(ev => (
                <span key={ev} className="text-xs px-2 py-0.5 rounded-full bg-discord-green/10 text-discord-green border border-discord-green/20">{ev}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* Auditoría */}
        <Card title="Auditoría" description="Registro de cambios administrativos en el servidor">
          <div className="mt-3 space-y-1">
            <ChannelSelect
              label="Canal de registro de auditoría"
              description="Cambios de rol, canal y apodo"
              channels={guildChannels}
              value={auditLogChannelId}
              onChange={setAuditLogChannelId}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['role_update','channel_update','nickname_change','server_update'].map(ev => (
                <span key={ev} className="text-xs px-2 py-0.5 rounded-full bg-discord-blurple/10 text-discord-blurple border border-discord-blurple/20">{ev}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* Voz */}
        <Card title="Voz" description="Registro de actividad en canales de voz">
          <div className="mt-3 space-y-1">
            <ChannelSelect
              label="Canal de registro de voz"
              description="Entradas, salidas y movimientos de voz"
              channels={guildChannels}
              value={voiceLogChannelId}
              onChange={setVoiceLogChannelId}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['voice_join','voice_leave','voice_move','voice_mute'].map(ev => (
                <span key={ev} className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">{ev}</span>
              ))}
            </div>
          </div>
        </Card>


        {/* Verificación */}
        <Card title="Verificación" description="Canal donde se registran las verificaciones realizadas con /verificacion">
          <div className="mt-3 space-y-1">
            <ChannelSelect
              label="Canal de registro de verificación"
              description="Logs del comando /verificacion (ID del usuario, supa y transcripción)"
              channels={guildChannels}
              value={verificationLogChannelId}
              onChange={setVerificationLogChannelId}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['verificacion'].map(ev => (
                <span key={ev} className="text-xs px-2 py-0.5 rounded-full bg-discord-green/10 text-discord-green border border-discord-green/20">{ev}</span>
              ))}
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
