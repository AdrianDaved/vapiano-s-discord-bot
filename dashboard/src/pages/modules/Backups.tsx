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
      toast.success('Copia de seguridad eliminada');
    } catch {
      toast.error('No se pudo eliminar la copia de seguridad');
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
      toast.error('No se pudieron cargar los detalles de la copia');
    }
  };

  if (configLoading || loading) return <Loader text="Cargando copias de seguridad..." />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Copias de seguridad</h1>
        <p className="text-discord-muted mt-1">Ver y administrar copias del servidor creadas con /backup</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatCard label="Copias totales" value={backupList.length} icon={Database} color="text-discord-blurple" />
        <StatCard
          label="Ultima copia"
          value={
            backupList.length > 0
              ? new Date(backupList[0].createdAt).toLocaleDateString()
              : 'Ninguna'
          }
          icon={HardDrive}
          color="text-discord-green"
        />
      </div>

      <Card title="Copias del servidor" description="Las copias se crean con el comando /backup create en Discord">
        <Table
          columns={[
            {
              key: 'name',
               label: 'Nombre',
               render: (b: Backup) => <span className="font-medium">{b.name || `Copia ${b.id.slice(0, 8)}`}</span>,
            },
            {
              key: 'channels',
               label: 'Canales',
              render: (b: Backup) => <span className="text-discord-muted">{b.channels ?? '-'}</span>,
            },
            {
              key: 'roles',
               label: 'Roles',
              render: (b: Backup) => <span className="text-discord-muted">{b.roles ?? '-'}</span>,
            },
            {
              key: 'createdAt',
               label: 'Creada',
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
                     title="Ver detalles"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(b.id)}
                    className="p-1 hover:text-discord-red text-discord-muted transition-colors"
                     title="Eliminar copia"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
          data={backupList}
          emptyMessage="No se encontraron copias. Usa /backup create en Discord para crear una."
        />
      </Card>

      {/* View Details Modal */}
      <Modal open={showView} onClose={() => setShowView(false)} title="Detalles de la copia" maxWidth="max-w-2xl">
        {viewBackup && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-discord-muted">Nombre</p>
                <p className="text-discord-white font-medium">{viewBackup.name || 'Sin nombre'}</p>
              </div>
              <div>
                <p className="text-xs text-discord-muted">Creada</p>
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
                     : <p className="text-sm text-discord-muted">Datos no disponibles</p>
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
                     : <p className="text-sm text-discord-muted">Datos no disponibles</p>
                  }
                </div>
              </div>
            )}

            <p className="text-xs text-discord-muted">
              Para restaurar esta copia, usa <code className="bg-discord-darker px-1 rounded">/backup restore {viewBackup.id}</code> en Discord.
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteBackup(deleteTarget)}
        title="Eliminar copia de seguridad"
        message="Seguro que quieres eliminar esta copia? Esta accion no se puede deshacer y los datos se perderan permanentemente."
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
