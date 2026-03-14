import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { sticky as stickyApi } from '@/lib/api';
import Card from '@/components/Card';
import Toggle from '@/components/Toggle';
import Input, { Textarea } from '@/components/Input';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { Pencil } from 'lucide-react';

interface StickyEntry {
  id: string;
  channelId: string;
  title: string | null;
  description: string;
  color: string;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
}

export default function StickyMessages() {
  const { guildId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [stickies, setStickies] = useState<StickyEntry[]>([]);

  // New sticky form
  const [channelId, setChannelId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#5865F2');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit state
  const [editTarget, setEditTarget] = useState<StickyEntry | null>(null);
  const [editData, setEditData] = useState({ title: '', description: '', color: '#5865F2' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    stickyApi.list(guildId)
      .then((data) => setStickies(data))
      .catch((err) => setError(err.message || 'Failed to load sticky messages'))
      .finally(() => setLoading(false));
  }, [guildId, retryCount]);

  const createSticky = async () => {
    if (!guildId) return;
    if (!channelId || !description) {
      toast.error('Channel ID and description are required');
      return;
    }
    setCreating(true);
    try {
      const s = await stickyApi.create(guildId, {
        channelId,
        title: title || null,
        description,
        color,
      });
      setStickies((prev) => [s, ...prev]);
      setChannelId('');
      setTitle('');
      setDescription('');
      setColor('#5865F2');
      toast.success('Sticky message created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create sticky');
    } finally {
      setCreating(false);
    }
  };

  const toggleEnabled = async (channelId: string, enabled: boolean) => {
    if (!guildId) return;
    try {
      await stickyApi.update(guildId, channelId, { enabled });
      setStickies((prev) =>
        prev.map((s) => (s.channelId === channelId ? { ...s, enabled } : s))
      );
      toast.success(`Sticky ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update');
    }
  };

  const deleteSticky = async (channelId: string) => {
    if (!guildId) return;
    setDeleting(true);
    try {
      await stickyApi.delete(guildId, channelId);
      setStickies((prev) => prev.filter((s) => s.channelId !== channelId));
      toast.success('Sticky message deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openEdit = (s: StickyEntry) => {
    setEditTarget(s);
    setEditData({ title: s.title || '', description: s.description, color: s.color });
  };

  const saveEdit = async () => {
    if (!guildId || !editTarget) return;
    setSaving(true);
    try {
      await stickyApi.update(guildId, editTarget.channelId, editData);
      setStickies((prev) => prev.map((s) =>
        s.channelId === editTarget.channelId
          ? { ...s, title: editData.title || null, description: editData.description, color: editData.color }
          : s
      ));
      setEditTarget(null);
      toast.success('Sticky message updated');
    } catch {
      toast.error('Failed to update sticky');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Loading sticky messages..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-discord-red text-lg font-semibold mb-2">Failed to load sticky messages</p>
        <p className="text-discord-muted text-sm mb-4">{error}</p>
        <button onClick={() => setRetryCount((c) => c + 1)} className="px-4 py-2 bg-discord-blurple text-white rounded-lg text-sm hover:bg-discord-blurple/80 transition-colors">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Sticky Messages</h1>
        <p className="text-discord-muted mt-1">Messages that stay pinned at the bottom of a channel</p>
      </div>

      <div className="space-y-6">
        <Card title="Create Sticky Message">
          <div className="space-y-4 mt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Channel ID"
                placeholder="Target channel ID"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
              />
              <Input
                label="Embed Color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
            <Input
              label="Title (optional)"
              placeholder="Embed title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Textarea
              label="Description"
              placeholder="Sticky message content..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={createSticky} loading={creating}>Create Sticky</Button>
          </div>
        </Card>

        <Card title={`Active Stickies (${stickies.length})`}>
          {stickies.length === 0 ? (
            <p className="text-discord-muted text-sm py-4">No sticky messages configured.</p>
          ) : (
            <div className="space-y-2 mt-3">
              {stickies.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-3 px-3 rounded-lg bg-discord-darker/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <div>
                        <p className="text-sm text-discord-white">
                          {s.title || 'Untitled'} <span className="text-discord-muted font-mono text-xs">#{s.channelId.slice(-4)}</span>
                        </p>
                        <p className="text-xs text-discord-muted mt-0.5 truncate max-w-md">{s.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3">
                    <button onClick={() => openEdit(s)} className="p-1 hover:text-discord-blurple text-discord-muted transition-colors" title="Edit">
                      <Pencil size={16} />
                    </button>
                    <Toggle
                      enabled={s.enabled}
                      onChange={(v) => toggleEnabled(s.channelId, v)}
                    />
                    <Button variant="danger" size="sm" onClick={() => setDeleteTarget(s.channelId)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Edit Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Sticky Message">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Title (optional)"
              placeholder="Embed title"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            />
            <Input
              label="Embed Color"
              type="color"
              value={editData.color}
              onChange={(e) => setEditData({ ...editData, color: e.target.value })}
            />
          </div>
          <Textarea
            label="Description"
            placeholder="Sticky message content..."
            value={editData.description}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
          />
          {editTarget && (
            <p className="text-xs text-discord-muted">Channel: {editTarget.channelId}</p>
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
        onConfirm={() => deleteTarget && deleteSticky(deleteTarget)}
        title="Delete Sticky Message"
        message="Are you sure you want to delete this sticky message? The message will no longer be pinned in the channel."
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
