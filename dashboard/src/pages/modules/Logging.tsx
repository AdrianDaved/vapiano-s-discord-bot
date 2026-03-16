import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { logging as loggingApi, config as configApi } from '@/lib/api';
import Card from '@/components/Card';
import Toggle from '@/components/Toggle';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import toast from 'react-hot-toast';

export default function Logging() {
  const { guildId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [loggingEnabled, setLoggingEnabled] = useState(false);
  const [modLogChannelId, setModLogChannelId] = useState('');
  const [messageLogChannelId, setMessageLogChannelId] = useState('');
  const [joinLeaveLogChannelId, setJoinLeaveLogChannelId] = useState('');
  const [auditLogChannelId, setAuditLogChannelId] = useState('');
  const [voiceLogChannelId, setVoiceLogChannelId] = useState('');

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    loggingApi.get(guildId)
      .then((data) => {
        setLoggingEnabled(data.loggingEnabled ?? false);
        setModLogChannelId(data.modLogChannelId ?? '');
        setMessageLogChannelId(data.messageLogChannelId ?? '');
        setJoinLeaveLogChannelId(data.joinLeaveLogChannelId ?? '');
        setAuditLogChannelId(data.auditLogChannelId ?? '');
        setVoiceLogChannelId(data.voiceLogChannelId ?? '');
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
        messageLogChannelId: messageLogChannelId || null,
        joinLeaveLogChannelId: joinLeaveLogChannelId || null,
        auditLogChannelId: auditLogChannelId || null,
        voiceLogChannelId: voiceLogChannelId || null,
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
        <p className="text-discord-muted mt-1">Configura donde se registran diferentes eventos</p>
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

        <Card title="Canales de registro" description="Define IDs de canal para cada tipo de registro. Deja vacio para desactivar.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <Input
               label="Canal de registro de moderacion"
               placeholder="Baneos, expulsiones, silencios, advertencias"
              value={modLogChannelId}
              onChange={(e) => setModLogChannelId(e.target.value)}
            />
            <Input
               label="Canal de registro de mensajes"
               placeholder="Ediciones y eliminaciones de mensajes"
              value={messageLogChannelId}
              onChange={(e) => setMessageLogChannelId(e.target.value)}
            />
            <Input
               label="Canal de registro de entradas/salidas"
               placeholder="Entradas y salidas de miembros"
              value={joinLeaveLogChannelId}
              onChange={(e) => setJoinLeaveLogChannelId(e.target.value)}
            />
            <Input
               label="Canal de registro de auditoria"
               placeholder="Cambios de rol/canal/apodo"
              value={auditLogChannelId}
              onChange={(e) => setAuditLogChannelId(e.target.value)}
            />
            <Input
               label="Canal de registro de voz"
               placeholder="Entradas, salidas y movimientos de voz"
              value={voiceLogChannelId}
              onChange={(e) => setVoiceLogChannelId(e.target.value)}
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={save} loading={saving}>Guardar cambios</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
