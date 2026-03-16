import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { starboard as starboardApi, config as configApi } from '@/lib/api';
import Card from '@/components/Card';
import Toggle from '@/components/Toggle';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import ConfirmDialog from '@/components/ConfirmDialog';
import toast from 'react-hot-toast';

interface StarboardEntry {
  id: string;
  originalMsgId: string;
  originalChId: string;
  authorId: string;
  stars: number;
  content: string | null;
  createdAt: string;
}

export default function Starboard() {
  const { guildId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Settings
  const [starboardEnabled, setStarboardEnabled] = useState(false);
  const [starboardChannelId, setStarboardChannelId] = useState('');
  const [starboardEmoji, setStarboardEmoji] = useState('⭐');
  const [starboardThreshold, setStarboardThreshold] = useState(3);

  // Entries
  const [entries, setEntries] = useState<StarboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      starboardApi.settings(guildId),
      starboardApi.list(guildId),
    ])
      .then(([settings, data]) => {
        setStarboardEnabled(settings.starboardEnabled ?? false);
        setStarboardChannelId(settings.starboardChannelId ?? '');
        setStarboardEmoji(settings.starboardEmoji ?? '⭐');
        setStarboardThreshold(settings.starboardThreshold ?? 3);
        setEntries(data.entries ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((err) => setError(err.message || 'No se pudo cargar el tablon de estrellas'))
      .finally(() => setLoading(false));
  }, [guildId, retryCount]);

  const save = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      await starboardApi.updateSettings(guildId, {
        starboardChannelId: starboardChannelId || null,
        starboardEmoji: starboardEmoji || '⭐',
        starboardThreshold,
      });
      toast.success('Configuracion del tablon de estrellas guardada');
    } catch {
      toast.error('No se pudo guardar la configuracion');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!guildId) return;
    setDeleting(true);
    try {
      await starboardApi.deleteEntry(guildId, id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success('Entrada eliminada');
    } catch {
      toast.error('No se pudo eliminar la entrada');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (loading) return <Loader text="Cargando starboard..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-discord-red text-lg font-semibold mb-2">No se pudo cargar el tablon de estrellas</p>
        <p className="text-discord-muted text-sm mb-4">{error}</p>
        <button onClick={() => setRetryCount((c) => c + 1)} className="px-4 py-2 bg-discord-blurple text-white rounded-lg text-sm hover:bg-discord-blurple/80 transition-colors">Reintentar</button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Tablon de estrellas</h1>
        <p className="text-discord-muted mt-1">Configura el tablon de estrellas para mensajes destacados</p>
      </div>

      <div className="space-y-6">
        <Card title="Configuracion">
          <div className="space-y-4 mt-3">
            <Toggle
               label="Activar tablon de estrellas"
               description="Permitir que los usuarios marquen mensajes con estrella para destacarlos"
              enabled={starboardEnabled}
              onChange={(v) => {
                setStarboardEnabled(v);
                if (guildId) configApi.update(guildId, { starboardEnabled: v }).then(
                   () => toast.success(`Tablon de estrellas ${v ? 'activado' : 'desactivado'}`),
                  () => toast.error('No se pudo actualizar'),
                );
              }}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                 label="ID del canal del tablon"
                 placeholder="ID del canal"
                value={starboardChannelId}
                onChange={(e) => setStarboardChannelId(e.target.value)}
              />
              <Input
                 label="Emoji de estrella"
                placeholder="⭐"
                value={starboardEmoji}
                onChange={(e) => setStarboardEmoji(e.target.value)}
              />
              <Input
                 label="Umbral"
                type="number"
                placeholder="3"
                value={starboardThreshold}
                onChange={(e) => setStarboardThreshold(parseInt(e.target.value) || 3)}
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={save} loading={saving}>Guardar configuracion</Button>
          </div>
        </Card>

        <Card title={`Mensajes con estrella (${total})`}>
          {entries.length === 0 ? (
            <p className="text-discord-muted text-sm py-4">Aun no hay mensajes con estrella.</p>
          ) : (
            <div className="space-y-2 mt-3">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-discord-darker/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-discord-yellow">{starboardEmoji} {entry.stars}</span>
                      <span className="text-xs text-discord-muted font-mono">#{entry.originalChId.slice(-4)}</span>
                    </div>
                    <p className="text-xs text-discord-light mt-1 truncate">
                       {entry.content || 'Sin contenido de texto'}
                    </p>
                  </div>
                   <Button variant="danger" size="sm" onClick={() => setDeleteTarget(entry.id)}>Eliminar</Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteEntry(deleteTarget)}
        title="Eliminar entrada de starboard"
        message="Seguro que quieres eliminar esta entrada de starboard? Tambien se eliminara la publicacion del mensaje con estrella."
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
