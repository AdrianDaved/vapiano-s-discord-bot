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
      .catch((err) => setError(err.message || 'Failed to load reaction roles'))
      .finally(() => setLoading(false));
  }, [guildId, retryCount]);

  const createRole = async () => {
    if (!guildId) return;
    if (!channelId || !messageId || !emoji || !roleId) {
      toast.error('All fields are required');
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
      toast.success('Reaction role created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create reaction role');
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
      toast.success('Reaction role deleted');
    } catch {
      toast.error('Failed to delete');
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
      toast.success('Reaction role updated');
    } catch {
      toast.error('Failed to update reaction role');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Loading reaction roles..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-discord-red text-lg font-semibold mb-2">Failed to load reaction roles</p>
        <p className="text-discord-muted text-sm mb-4">{error}</p>
        <button onClick={() => setRetryCount((c) => c + 1)} className="px-4 py-2 bg-discord-blurple text-white rounded-lg text-sm hover:bg-discord-blurple/80 transition-colors">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Reaction Roles</h1>
        <p className="text-discord-muted mt-1">Manage reaction/button roles for your server</p>
      </div>

      <div className="space-y-6">
        <Card title="Create Reaction Role">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <Input
              label="Channel ID"
              placeholder="Channel containing the message"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
            />
            <Input
              label="Message ID"
              placeholder="Message to attach role to"
              value={messageId}
              onChange={(e) => setMessageId(e.target.value)}
            />
            <Input
              label="Emoji"
              placeholder="Emoji or emoji ID"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
            />
            <Input
              label="Role ID"
              placeholder="Role to assign"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            />
            <Select
              label="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
                { value: 'toggle', label: 'Toggle (add/remove)' },
                { value: 'give', label: 'Give only' },
                { value: 'remove', label: 'Remove only' },
              ]}
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={createRole} loading={creating}>Create</Button>
          </div>
        </Card>

        <Card title={`Existing Roles (${roles.length})`}>
          {roles.length === 0 ? (
            <p className="text-discord-muted text-sm py-4">No reaction roles configured.</p>
          ) : (
            <div className="space-y-2 mt-3">
              {roles.map((rr) => (
                <div key={rr.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-discord-darker/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{rr.emoji}</span>
                      <div>
                        <p className="text-sm text-discord-white font-mono">Role: {rr.roleId}</p>
                        <p className="text-xs text-discord-muted">
                          Message: {rr.messageId.slice(0, 12)}... | Type: {rr.type} | Channel: {rr.channelId.slice(-6)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(rr)} className="p-1 hover:text-discord-blurple text-discord-muted transition-colors" title="Edit">
                      <Pencil size={16} />
                    </button>
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(rr.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Reaction Role">
        <div className="space-y-4">
          <Input
            label="Emoji"
            placeholder="Emoji or emoji ID"
            value={editData.emoji}
            onChange={(e) => setEditData({ ...editData, emoji: e.target.value })}
          />
          <Input
            label="Role ID"
            placeholder="Role to assign"
            value={editData.roleId}
            onChange={(e) => setEditData({ ...editData, roleId: e.target.value })}
          />
          <Select
            label="Type"
            value={editData.type}
            onChange={(e) => setEditData({ ...editData, type: e.target.value })}
            options={[
              { value: 'toggle', label: 'Toggle (add/remove)' },
              { value: 'give', label: 'Give only' },
              { value: 'remove', label: 'Remove only' },
            ]}
          />
          {editTarget && (
            <div className="text-xs text-discord-muted">
              <p>Channel: {editTarget.channelId}</p>
              <p>Message: {editTarget.messageId}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={saveEdit} loading={saving}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteRole(deleteTarget)}
        title="Delete Reaction Role"
        message="Are you sure you want to delete this reaction role? Users will no longer be able to get this role by reacting."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
