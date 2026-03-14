import { useEffect, useState } from 'react';
import { useGuild } from '@/hooks/useGuild';
import { backups as backupsApi } from '@/lib/api';
import Card from '@/components/Card';
import Table from '@/components/Table';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import StatCard from '@/components/StatCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { Database, HardDrive, Trash2, Eye } from 'lucide-react';
import Modal from '@/components/Modal';

interface Backup {
  id: string;
  name: string;
  createdAt: string;
  size?: number;
  channels?: number;
  roles?: number;
}

export default function Backups() {
  const { guildId, loading: configLoading } = useGuild();
  const [backupList, setBackupList] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewBackup, setViewBackup] = useState<any>(null);
  const [showView, setShowView] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    backupsApi
      .list(guildId)
      .then((data) => setBackupList(data.backups || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  const deleteBackup = async (id: string) => {
    if (!guildId) return;
    setDeleting(true);
    try {
      await backupsApi.delete(guildId, id);
      setBackupList((prev) => prev.filter((b) => b.id !== id));
      toast.success('Backup deleted');
    } catch {
      toast.error('Failed to delete backup');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const viewBackupDetails = async (id: string) => {
    if (!guildId) return;
    try {
      const data = await backupsApi.get(guildId, id);
      setViewBackup(data.backup || data);
      setShowView(true);
    } catch {
      toast.error('Failed to load backup details');
    }
  };

  if (configLoading || loading) return <Loader text="Loading backups..." />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Backups</h1>
        <p className="text-discord-muted mt-1">View and manage server backups created with /backup</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatCard label="Total Backups" value={backupList.length} icon={Database} color="text-discord-blurple" />
        <StatCard
          label="Latest Backup"
          value={
            backupList.length > 0
              ? new Date(backupList[0].createdAt).toLocaleDateString()
              : 'None'
          }
          icon={HardDrive}
          color="text-discord-green"
        />
      </div>

      <Card title="Server Backups" description="Backups are created via the /backup create command in Discord">
        <Table
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (b: Backup) => <span className="font-medium">{b.name || `Backup ${b.id.slice(0, 8)}`}</span>,
            },
            {
              key: 'channels',
              label: 'Channels',
              render: (b: Backup) => <span className="text-discord-muted">{b.channels ?? '-'}</span>,
            },
            {
              key: 'roles',
              label: 'Roles',
              render: (b: Backup) => <span className="text-discord-muted">{b.roles ?? '-'}</span>,
            },
            {
              key: 'createdAt',
              label: 'Created',
              render: (b: Backup) => (
                <span className="text-discord-muted text-xs">
                  {new Date(b.createdAt).toLocaleString()}
                </span>
              ),
            },
            {
              key: 'actions',
              label: '',
              render: (b: Backup) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => viewBackupDetails(b.id)}
                    className="p-1 hover:text-discord-blurple text-discord-muted transition-colors"
                    title="View details"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(b.id)}
                    className="p-1 hover:text-discord-red text-discord-muted transition-colors"
                    title="Delete backup"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
          data={backupList}
          emptyMessage="No backups found. Use /backup create in Discord to create one."
        />
      </Card>

      {/* View Details Modal */}
      <Modal open={showView} onClose={() => setShowView(false)} title="Backup Details" maxWidth="max-w-2xl">
        {viewBackup && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-discord-muted">Name</p>
                <p className="text-discord-white font-medium">{viewBackup.name || 'Unnamed'}</p>
              </div>
              <div>
                <p className="text-xs text-discord-muted">Created</p>
                <p className="text-discord-white">{new Date(viewBackup.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {viewBackup.channels && (
              <div>
                <p className="text-xs text-discord-muted mb-2">Channels ({viewBackup.channels.length || 0})</p>
                <div className="bg-discord-darker rounded-lg p-3 max-h-40 overflow-y-auto">
                  {Array.isArray(viewBackup.channels)
                    ? viewBackup.channels.map((ch: any, i: number) => (
                        <p key={i} className="text-sm text-discord-muted">
                          #{ch.name || ch}
                        </p>
                      ))
                    : <p className="text-sm text-discord-muted">Data not available</p>
                  }
                </div>
              </div>
            )}

            {viewBackup.roles && (
              <div>
                <p className="text-xs text-discord-muted mb-2">Roles ({viewBackup.roles.length || 0})</p>
                <div className="bg-discord-darker rounded-lg p-3 max-h-40 overflow-y-auto">
                  {Array.isArray(viewBackup.roles)
                    ? viewBackup.roles.map((role: any, i: number) => (
                        <p key={i} className="text-sm text-discord-muted">
                          @{role.name || role}
                        </p>
                      ))
                    : <p className="text-sm text-discord-muted">Data not available</p>
                  }
                </div>
              </div>
            )}

            <p className="text-xs text-discord-muted">
              To restore this backup, use <code className="bg-discord-darker px-1 rounded">/backup restore {viewBackup.id}</code> in Discord.
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteBackup(deleteTarget)}
        title="Delete Backup"
        message="Are you sure you want to delete this backup? This action cannot be undone and the backup data will be permanently lost."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
