import { useEffect, useState } from 'react';
import { useGuild } from '@/hooks/useGuild';
import { moderation as modApi } from '@/lib/api';
import Card from '@/components/Card';
import Table from '@/components/Table';
import Loader from '@/components/Loader';
import StatCard from '@/components/StatCard';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { Shield, AlertTriangle, Gavel, Trash2 } from 'lucide-react';

interface ModAction {
  id: string;
  type: string;
  userId: string;
  userTag: string;
  moderatorTag: string;
  reason: string | null;
  createdAt: string;
}

interface Warning {
  id: string;
  userId: string;
  userTag: string;
  moderatorTag: string;
  reason: string;
  createdAt: string;
}

export default function Moderation() {
  const { guildId, loading: configLoading } = useGuild();
  const [actions, setActions] = useState<ModAction[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'actions' | 'warnings'>('actions');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    Promise.all([
      modApi.actions(guildId).catch(() => []),
      modApi.warnings(guildId).catch(() => []),
    ])
      .then(([acts, warns]) => {
        setActions(acts.actions || acts);
        setWarnings(warns.warnings || warns);
      })
      .finally(() => setLoading(false));
  }, [guildId]);

  const deleteWarning = async (id: string) => {
    if (!guildId) return;
    setDeleting(true);
    try {
      await modApi.deleteWarning(guildId, id);
      setWarnings((prev) => prev.filter((w) => w.id !== id));
      toast.success('Advertencia eliminada');
    } catch {
      toast.error('No se pudo eliminar la advertencia');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (configLoading || loading) return <Loader text="Cargando moderacion..." />;

  const typeColor: Record<string, string> = {
    warn: 'text-discord-yellow',
    mute: 'text-discord-fuchsia',
    kick: 'text-discord-red',
    ban: 'text-discord-red',
    tempban: 'text-discord-red',
    tempmute: 'text-discord-fuchsia',
    unmute: 'text-discord-green',
    unban: 'text-discord-green',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Moderacion</h1>
        <p className="text-discord-muted mt-1">Ver acciones de moderacion y advertencias</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Acciones totales" value={actions.length} icon={Gavel} color="text-discord-blurple" />
        <StatCard label="Advertencias activas" value={warnings.length} icon={AlertTriangle} color="text-discord-yellow" />
        <StatCard
          label="Baneos"
          value={actions.filter((a) => a.type === 'ban' || a.type === 'tempban').length}
          icon={Shield}
          color="text-discord-red"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={tab === 'actions' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTab('actions')}
        >
          Acciones de mod ({actions.length})
        </Button>
        <Button
          variant={tab === 'warnings' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTab('warnings')}
        >
          Advertencias ({warnings.length})
        </Button>
      </div>

      {tab === 'actions' && (
        <Card>
          <Table
            columns={[
              {
                key: 'type',
                label: 'Accion',
                render: (a: ModAction) => (
                  <span className={`font-medium uppercase text-xs ${typeColor[a.type] || ''}`}>
                    {a.type}
                  </span>
                ),
              },
               { key: 'userTag', label: 'Usuario' },
               { key: 'moderatorTag', label: 'Moderador' },
              {
                key: 'reason',
                 label: 'Razon',
                render: (a: ModAction) => (
                   <span className="text-discord-muted">{a.reason || 'Sin razon'}</span>
                ),
              },
              {
                key: 'createdAt',
                 label: 'Fecha',
                render: (a: ModAction) => (
                  <span className="text-discord-muted text-xs">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                ),
              },
            ]}
            data={actions}
            emptyMessage="No hay acciones de moderacion registradas."
          />
        </Card>
      )}

      {tab === 'warnings' && (
        <Card>
          <Table
            columns={[
               { key: 'userTag', label: 'Usuario' },
               { key: 'moderatorTag', label: 'Emitida por' },
               { key: 'reason', label: 'Razon' },
              {
                key: 'createdAt',
                 label: 'Fecha',
                render: (w: Warning) => (
                  <span className="text-discord-muted text-xs">
                    {new Date(w.createdAt).toLocaleDateString()}
                  </span>
                ),
              },
              {
                key: 'actions',
                label: '',
                render: (w: Warning) => (
                  <button
                    onClick={() => setDeleteTarget(w.id)}
                    className="p-1 hover:text-discord-red text-discord-muted transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                ),
              },
            ]}
            data={warnings}
            emptyMessage="No hay advertencias activas."
          />
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteWarning(deleteTarget)}
        title="Eliminar advertencia"
        message="Seguro que quieres eliminar esta advertencia? Esta accion no se puede deshacer."
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
