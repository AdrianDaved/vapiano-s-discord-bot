import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { reputation } from '@/lib/api';
import { useGuild } from '@/hooks/useGuild';
import Card from '@/components/Card';
import Loader from '@/components/Loader';
import Table from '@/components/Table';
import Input from '@/components/Input';
import Button from '@/components/Button';
import { toast } from 'react-hot-toast';

interface RepEntry {
  userId: string;
  rep: number;
}

interface RecentRep {
  id: string;
  userId: string;
  giverId: string;
  reason: string | null;
  createdAt: string;
}

export default function Reputation() {
  const { guildId } = useParams();
  const { config, updateConfig } = useGuild();
  const [leaderboard, setLeaderboard] = useState<RepEntry[]>([]);
  const [recent, setRecent] = useState<RecentRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [repChannelId, setRepChannelId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!config) return;
    setRepChannelId(config.repChannelId ?? '1420875609554292836');
  }, [config]);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      reputation.leaderboard(guildId),
      reputation.recent(guildId),
    ])
      .then(([lb, rc]) => {
        setLeaderboard(lb);
        setRecent(rc);
      })
      .catch((err) => setError(err.message || 'No se pudieron cargar los datos de reputación'))
      .finally(() => setLoading(false));
  }, [guildId, retryCount]);

  const saveChannel = async () => {
    setSaving(true);
    try {
      await updateConfig({ repChannelId: repChannelId || null });
      toast.success('Canal de reputación guardado');
    } catch {
      toast.error('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Cargando reputación..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-discord-red text-lg font-semibold mb-2">No se pudo cargar la reputación</p>
        <p className="text-discord-muted text-sm mb-4">{error}</p>
        <button onClick={() => setRetryCount((c) => c + 1)} className="px-4 py-2 bg-discord-blurple text-white rounded-lg text-sm hover:bg-discord-blurple/80 transition-colors">Reintentar</button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Reputación</h1>
        <p className="text-discord-muted mt-1">Configura el canal y consulta la actividad de reputación</p>
      </div>

      <Card title="Configuración" description="Canal donde se pueden usar los comandos de reputación" className="mb-6">
        <div className="flex items-end gap-4 mt-2">
          <div className="flex-1">
            <Input
              label="ID del canal de reputación"
              placeholder="1420875609554292836"
              value={repChannelId}
              onChange={(e) => setRepChannelId(e.target.value)}
            />
          </div>
          <Button onClick={saveChannel} loading={saving}>
            Guardar
          </Button>
        </div>
        <p className="text-xs text-discord-muted mt-2">
          Los usuarios que intenten usar <code>/rep dar</code> fuera de este canal recibirán un aviso indicando el canal correcto.
        </p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Clasificación">
          {leaderboard.length === 0 ? (
            <p className="text-discord-muted text-sm py-4">Aún no hay datos de reputación.</p>
          ) : (
            <div className="space-y-2 mt-3">
              {leaderboard.slice(0, 20).map((entry, i) => (
                <div key={entry.userId} className="flex items-center justify-between py-2 px-3 rounded-lg bg-discord-darker/50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-discord-muted w-6">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </span>
                    <span className="text-sm text-discord-white font-mono">{entry.userId}</span>
                  </div>
                  <span className="text-sm font-bold text-discord-green">{entry.rep} rep</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Actividad reciente">
          {recent.length === 0 ? (
            <p className="text-discord-muted text-sm py-4">No hay actividad reciente de reputación.</p>
          ) : (
            <div className="space-y-2 mt-3">
              {recent.slice(0, 20).map((entry) => (
                <div key={entry.id} className="py-2 px-3 rounded-lg bg-discord-darker/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-discord-muted">
                      <span className="font-mono">{entry.giverId.slice(0, 8)}</span> → <span className="font-mono">{entry.userId.slice(0, 8)}</span>
                    </span>
                    <span className="text-xs text-discord-muted">{new Date(entry.createdAt).toLocaleDateString()}</span>
                  </div>
                  {entry.reason && (
                    <p className="text-xs text-discord-light mt-1">{entry.reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
