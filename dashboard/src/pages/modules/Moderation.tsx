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
      toast.success('Warning removed');
    } catch {
      toast.error('Failed to remove warning');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (configLoading || loading) return <Loader text="Loading moderation..." />;

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
        <h1 className="text-2xl font-bold text-discord-white">Moderation</h1>
        <p className="text-discord-muted mt-1">View moderation actions and warnings</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Actions" value={actions.length} icon={Gavel} color="text-discord-blurple" />
        <StatCard label="Active Warnings" value={warnings.length} icon={AlertTriangle} color="text-discord-yellow" />
        <StatCard
          label="Bans"
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
          Mod Actions ({actions.length})
        </Button>
        <Button
          variant={tab === 'warnings' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTab('warnings')}
        >
          Warnings ({warnings.length})
        </Button>
      </div>

      {tab === 'actions' && (
        <Card>
          <Table
            columns={[
              {
                key: 'type',
                label: 'Action',
                render: (a: ModAction) => (
                  <span className={`font-medium uppercase text-xs ${typeColor[a.type] || ''}`}>
                    {a.type}
                  </span>
                ),
              },
              { key: 'userTag', label: 'User' },
              { key: 'moderatorTag', label: 'Moderator' },
              {
                key: 'reason',
                label: 'Reason',
                render: (a: ModAction) => (
                  <span className="text-discord-muted">{a.reason || 'No reason'}</span>
                ),
              },
              {
                key: 'createdAt',
                label: 'Date',
                render: (a: ModAction) => (
                  <span className="text-discord-muted text-xs">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                ),
              },
            ]}
            data={actions}
            emptyMessage="No moderation actions recorded."
          />
        </Card>
      )}

      {tab === 'warnings' && (
        <Card>
          <Table
            columns={[
              { key: 'userTag', label: 'User' },
              { key: 'moderatorTag', label: 'Issued By' },
              { key: 'reason', label: 'Reason' },
              {
                key: 'createdAt',
                label: 'Date',
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
            emptyMessage="No active warnings."
          />
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteWarning(deleteTarget)}
        title="Remove Warning"
        message="Are you sure you want to remove this warning? This action cannot be undone."
        confirmLabel="Remove"
        loading={deleting}
      />
    </div>
  );
}
