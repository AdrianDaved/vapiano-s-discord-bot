import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { reactionRoles as rrApi } from '@/lib/api';
import Card from '@/components/Card';
import Input, { Select } from '@/components/Input';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { Pencil } from 'lucide-react';

interface ReactionRoleEntry {
  id: string;
  channelId: string;
  messageId: string;
  emoji: string;
  roleId: string;
  type: string;
}

export default function ReactionRoles() {
  const { guildId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [roles, setRoles] = useState<ReactionRoleEntry[]>([]);

  // New reaction role form
  const [channelId, setChannelId] = useState('');
  const [messageId, setMessageId] = useState('');
  const [emoji, setEmoji] = useState('');
  const [roleId, setRoleId] = useState('');
  const [type, setType] = useState('toggle');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit state
  const [editTarget, setEditTarget] = useState<ReactionRoleEntry | null>(null);
  const [editData, setEditData] = useState({ emoji: '', roleId: '', type: 'toggle' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    rrApi.list(guildId)
      .then((data) => setRoles(data))
      .catch((err) => setError(err.message || 'No se pudieron cargar los roles por reaccion'))
      .finally(() => setLoading(false));
  }, [guildId, retryCount]);

  const createRole = async () => {
    if (!guildId) return;
    if (!channelId || !messageId || !emoji || !roleId) {
      toast.error('Todos los campos son obligatorios');
      return;
    }
    setCreating(true);
    try {
      const rr = await rrApi.create(guildId, { channelId, messageId, emoji, roleId, type });
      setRoles((prev) => [...prev, rr]);
      setChannelId('');
      setMessageId('');
      setEmoji('');
      setRoleId('');
      setType('toggle');
      toast.success('Rol por reaccion creado');
    } catch (err: any) {
      toast.error(err.message || 'No se pudo crear el rol por reaccion');
    } finally {
      setCreating(false);
    }
  };

  const deleteRole = async (id: string) => {
    if (!guildId) return;
    setDeleting(true);
    try {
      await rrApi.delete(guildId, id);
      setRoles((prev) => prev.filter((r) => r.id !== id));
      toast.success('Rol por reaccion eliminado');
    } catch {
      toast.error('No se pudo eliminar');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openEdit = (rr: ReactionRoleEntry) => {
    setEditTarget(rr);
    setEditData({ emoji: rr.emoji, roleId: rr.roleId, type: rr.type });
  };

  const saveEdit = async () => {
    if (!guildId || !editTarget) return;
    setSaving(true);
    try {
      const result = await rrApi.update(guildId, editTarget.id, editData);
      const updated = result.reactionRole || result;
      setRoles((prev) => prev.map((r) => r.id === editTarget.id ? { ...r, ...updated } : r));
      setEditTarget(null);
      toast.success('Rol por reaccion actualizado');
    } catch {
      toast.error('No se pudo actualizar el rol por reaccion');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Cargando roles por reaccion..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-discord-red text-lg font-semibold mb-2">No se pudieron cargar los roles por reaccion</p>
        <p className="text-discord-muted text-sm mb-4">{error}</p>
        <button onClick={() => setRetryCount((c) => c + 1)} className="px-4 py-2 bg-discord-blurple text-white rounded-lg text-sm hover:bg-discord-blurple/80 transition-colors">Reintentar</button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Roles por reaccion</h1>
        <p className="text-discord-muted mt-1">Administra roles por reaccion/boton para tu servidor</p>
      </div>

      <div className="space-y-6">
        <Card title="Crear rol por reaccion">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <Input
                label="ID del canal"
                placeholder="Canal que contiene el mensaje"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
            />
            <Input
                label="ID del mensaje"
                placeholder="Mensaje al que se asigna el rol"
              value={messageId}
              onChange={(e) => setMessageId(e.target.value)}
            />
            <Input
                label="Emoji"
                placeholder="Emoji o ID de emoji"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
            />
            <Input
                label="ID del rol"
                placeholder="Rol a asignar"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            />
            <Select
               label="Tipo"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
                 { value: 'toggle', label: 'Alternar (agregar/quitar)' },
                 { value: 'give', label: 'Solo dar' },
                 { value: 'remove', label: 'Solo quitar' },
              ]}
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={createRole} loading={creating}>Crear</Button>
          </div>
        </Card>

        <Card title={`Roles existentes (${roles.length})`}>
          {roles.length === 0 ? (
            <p className="text-discord-muted text-sm py-4">No hay roles por reaccion configurados.</p>
          ) : (
            <div className="space-y-2 mt-3">
              {roles.map((rr) => (
                <div key={rr.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-discord-darker/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{rr.emoji}</span>
                      <div>
                         <p className="text-sm text-discord-white font-mono">Rol: {rr.roleId}</p>
                        <p className="text-xs text-discord-muted">
                           Mensaje: {rr.messageId.slice(0, 12)}... | Tipo: {rr.type} | Canal: {rr.channelId.slice(-6)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => openEdit(rr)} className="p-1 hover:text-discord-blurple text-discord-muted transition-colors" title="Editar">
                      <Pencil size={16} />
                    </button>
                     <Button variant="danger" size="sm" onClick={() => setDeleteTarget(rr.id)}>Eliminar</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar rol por reaccion">
        <div className="space-y-4">
          <Input
            label="Emoji"
            placeholder="Emoji o ID de emoji"
            value={editData.emoji}
            onChange={(e) => setEditData({ ...editData, emoji: e.target.value })}
          />
          <Input
            label="ID del rol"
            placeholder="Rol a asignar"
            value={editData.roleId}
            onChange={(e) => setEditData({ ...editData, roleId: e.target.value })}
          />
          <Select
            label="Tipo"
            value={editData.type}
            onChange={(e) => setEditData({ ...editData, type: e.target.value })}
            options={[
               { value: 'toggle', label: 'Alternar (agregar/quitar)' },
               { value: 'give', label: 'Solo dar' },
               { value: 'remove', label: 'Solo quitar' },
            ]}
          />
          {editTarget && (
            <div className="text-xs text-discord-muted">
               <p>Canal: {editTarget.channelId}</p>
               <p>Mensaje: {editTarget.messageId}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancelar</Button>
            <Button onClick={saveEdit} loading={saving}>Guardar cambios</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteRole(deleteTarget)}
        title="Eliminar rol por reaccion"
        message="Seguro que quieres eliminar este rol por reaccion? Los usuarios ya no podran obtener este rol reaccionando."
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
