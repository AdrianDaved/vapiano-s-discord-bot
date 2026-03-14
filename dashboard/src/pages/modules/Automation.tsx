import { useEffect, useState } from 'react';
import { useGuild } from '@/hooks/useGuild';
import { automation as autoApi } from '@/lib/api';
import Card from '@/components/Card';
import Table from '@/components/Table';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { Textarea } from '@/components/Input';
import Modal from '@/components/Modal';
import Loader from '@/components/Loader';
import ConfirmDialog from '@/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { MessageSquare, Clock, Plus, Trash2, ToggleLeft, Pencil } from 'lucide-react';

interface AutoResponse {
  id: string;
  trigger: string;
  response: string;
  matchMode: string;
  enabled: boolean;
}

interface ScheduledMessage {
  id: string;
  channelId: string;
  message: string;
  cron: string;
  enabled: boolean;
}

export default function Automation() {
  const { guildId, loading: configLoading } = useGuild();
  const [responses, setResponses] = useState<AutoResponse[]>([]);
  const [scheduled, setScheduled] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'responses' | 'scheduled'>('responses');

  // Add response modal
  const [showAddResponse, setShowAddResponse] = useState(false);
  const [newResponse, setNewResponse] = useState({ trigger: '', response: '', matchMode: 'contains' });
  const [addingResponse, setAddingResponse] = useState(false);

  // Add scheduled modal
  const [showAddScheduled, setShowAddScheduled] = useState(false);
  const [newScheduled, setNewScheduled] = useState({ channelId: '', message: '', cron: '' });
  const [addingScheduled, setAddingScheduled] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: 'response' | 'scheduled' } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit response modal
  const [editResponse, setEditResponse] = useState<AutoResponse | null>(null);
  const [editResponseData, setEditResponseData] = useState({ trigger: '', response: '', matchMode: 'contains' });
  const [savingResponse, setSavingResponse] = useState(false);

  // Edit scheduled modal
  const [editScheduled, setEditScheduled] = useState<ScheduledMessage | null>(null);
  const [editScheduledData, setEditScheduledData] = useState({ channelId: '', message: '', cron: '' });
  const [savingScheduled, setSavingScheduled] = useState(false);

  useEffect(() => {
    if (!guildId) return;
    Promise.all([
      autoApi.responses(guildId).catch(() => []),
      autoApi.scheduled(guildId).catch(() => []),
    ])
      .then(([r, s]) => {
        setResponses(r.responses || r);
        setScheduled(s.scheduled || s);
      })
      .finally(() => setLoading(false));
  }, [guildId]);

  const addResponse = async () => {
    if (!guildId || !newResponse.trigger || !newResponse.response) return;
    setAddingResponse(true);
    try {
      const result = await autoApi.createResponse(guildId, newResponse);
      setResponses((prev) => [...prev, result.response || result]);
      setShowAddResponse(false);
      setNewResponse({ trigger: '', response: '', matchMode: 'contains' });
      toast.success('Auto-response added');
    } catch {
      toast.error('Failed to add response');
    } finally {
      setAddingResponse(false);
    }
  };

  const deleteResponse = async (id: string) => {
    if (!guildId) return;
    setDeleting(true);
    try {
      await autoApi.deleteResponse(guildId, id);
      setResponses((prev) => prev.filter((r) => r.id !== id));
      toast.success('Response deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const addScheduledMsg = async () => {
    if (!guildId || !newScheduled.channelId || !newScheduled.message || !newScheduled.cron) return;
    setAddingScheduled(true);
    try {
      const result = await autoApi.createScheduled(guildId, newScheduled);
      setScheduled((prev) => [...prev, result.scheduled || result]);
      setShowAddScheduled(false);
      setNewScheduled({ channelId: '', message: '', cron: '' });
      toast.success('Scheduled message added');
    } catch {
      toast.error('Failed to add scheduled message');
    } finally {
      setAddingScheduled(false);
    }
  };

  const deleteScheduledMsg = async (id: string) => {
    if (!guildId) return;
    setDeleting(true);
    try {
      await autoApi.deleteScheduled(guildId, id);
      setScheduled((prev) => prev.filter((s) => s.id !== id));
      toast.success('Scheduled message deleted');
    } catch {
      toast.error('Failed to delete');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openEditResponse = (r: AutoResponse) => {
    setEditResponse(r);
    setEditResponseData({ trigger: r.trigger, response: r.response, matchMode: r.matchMode });
  };

  const saveEditResponse = async () => {
    if (!guildId || !editResponse) return;
    setSavingResponse(true);
    try {
      const result = await autoApi.updateResponse(guildId, editResponse.id, editResponseData);
      const updated = result.response || result;
      setResponses((prev) => prev.map((r) => r.id === editResponse.id ? { ...r, ...updated } : r));
      setEditResponse(null);
      toast.success('Auto-response updated');
    } catch {
      toast.error('Failed to update response');
    } finally {
      setSavingResponse(false);
    }
  };

  const openEditScheduled = (s: ScheduledMessage) => {
    setEditScheduled(s);
    setEditScheduledData({ channelId: s.channelId, message: s.message, cron: s.cron });
  };

  const saveEditScheduled = async () => {
    if (!guildId || !editScheduled) return;
    setSavingScheduled(true);
    try {
      const result = await autoApi.updateScheduled(guildId, editScheduled.id, editScheduledData);
      const updated = result.scheduled || result;
      setScheduled((prev) => prev.map((s) => s.id === editScheduled.id ? { ...s, ...updated } : s));
      setEditScheduled(null);
      toast.success('Scheduled message updated');
    } catch {
      toast.error('Failed to update scheduled message');
    } finally {
      setSavingScheduled(false);
    }
  };

  const toggleResponseEnabled = async (r: AutoResponse) => {
    if (!guildId) return;
    try {
      await autoApi.updateResponse(guildId, r.id, { enabled: !r.enabled });
      setResponses((prev) => prev.map((item) => item.id === r.id ? { ...item, enabled: !item.enabled } : item));
      toast.success(`Response ${!r.enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to toggle response');
    }
  };

  if (configLoading || loading) return <Loader text="Loading automation..." />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Automation</h1>
        <p className="text-discord-muted mt-1">Auto-responses and scheduled messages</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={tab === 'responses' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTab('responses')}
        >
          <MessageSquare size={14} />
          Auto-Responses ({responses.length})
        </Button>
        <Button
          variant={tab === 'scheduled' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTab('scheduled')}
        >
          <Clock size={14} />
          Scheduled ({scheduled.length})
        </Button>
      </div>

      {/* Auto-Responses */}
      {tab === 'responses' && (
        <Card
          title="Auto-Responses"
          description="Automatically reply when a trigger is matched"
          action={
            <Button size="sm" onClick={() => setShowAddResponse(true)}>
              <Plus size={14} />
              Add Response
            </Button>
          }
        >
          <Table
            columns={[
              {
                key: 'enabled',
                label: '',
                render: (r: AutoResponse) => (
                  <button
                    onClick={() => toggleResponseEnabled(r)}
                    className={`${r.enabled ? 'text-discord-green' : 'text-discord-muted'} hover:opacity-70 transition-opacity`}
                    title={r.enabled ? 'Disable' : 'Enable'}
                  >
                    <ToggleLeft size={16} />
                  </button>
                ),
              },
              {
                key: 'trigger',
                label: 'Trigger',
                render: (r: AutoResponse) => (
                  <code className="text-sm bg-discord-darker px-2 py-0.5 rounded">{r.trigger}</code>
                ),
              },
              {
                key: 'matchMode',
                label: 'Mode',
                render: (r: AutoResponse) => (
                  <span className="text-xs text-discord-muted uppercase">{r.matchMode}</span>
                ),
              },
              {
                key: 'response',
                label: 'Response',
                render: (r: AutoResponse) => (
                  <span className="text-discord-muted truncate max-w-xs block">{r.response}</span>
                ),
              },
              {
                key: 'actions',
                label: '',
                render: (r: AutoResponse) => (
                  <div className="flex gap-1">
                    <button onClick={() => openEditResponse(r)} className="p-1 hover:text-discord-blurple text-discord-muted transition-colors" title="Edit">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleteTarget({ id: r.id, type: 'response' })} className="p-1 hover:text-discord-red text-discord-muted transition-colors" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ),
              },
            ]}
            data={responses}
            emptyMessage="No auto-responses configured."
          />
        </Card>
      )}

      {/* Scheduled Messages */}
      {tab === 'scheduled' && (
        <Card
          title="Scheduled Messages"
          description="Send messages on a cron schedule"
          action={
            <Button size="sm" onClick={() => setShowAddScheduled(true)}>
              <Plus size={14} />
              Add Message
            </Button>
          }
        >
          <Table
            columns={[
              {
                key: 'cron',
                label: 'Schedule',
                render: (s: ScheduledMessage) => (
                  <code className="text-sm bg-discord-darker px-2 py-0.5 rounded">{s.cron}</code>
                ),
              },
              {
                key: 'channelId',
                label: 'Channel',
                render: (s: ScheduledMessage) => (
                  <code className="text-xs text-discord-muted">{s.channelId}</code>
                ),
              },
              {
                key: 'message',
                label: 'Message',
                render: (s: ScheduledMessage) => (
                  <span className="text-discord-muted truncate max-w-xs block">{s.message}</span>
                ),
              },
              {
                key: 'actions',
                label: '',
                render: (s: ScheduledMessage) => (
                  <div className="flex gap-1">
                    <button onClick={() => openEditScheduled(s)} className="p-1 hover:text-discord-blurple text-discord-muted transition-colors" title="Edit">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleteTarget({ id: s.id, type: 'scheduled' })} className="p-1 hover:text-discord-red text-discord-muted transition-colors" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ),
              },
            ]}
            data={scheduled}
            emptyMessage="No scheduled messages."
          />
        </Card>
      )}

      {/* Add Response Modal */}
      <Modal open={showAddResponse} onClose={() => setShowAddResponse(false)} title="Add Auto-Response">
        <div className="space-y-4">
          <Input
            label="Trigger"
            placeholder="hello"
            value={newResponse.trigger}
            onChange={(e) => setNewResponse({ ...newResponse, trigger: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-discord-muted mb-1.5">Match Mode</label>
            <div className="flex gap-2">
              {['contains', 'exact', 'startsWith'].map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={newResponse.matchMode === mode ? 'primary' : 'secondary'}
                  onClick={() => setNewResponse({ ...newResponse, matchMode: mode })}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>
          <Textarea
            label="Response"
            placeholder="Hey there! How can I help?"
            value={newResponse.response}
            onChange={(e) => setNewResponse({ ...newResponse, response: e.target.value })}
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setShowAddResponse(false)}>Cancel</Button>
            <Button onClick={addResponse} loading={addingResponse}>Add Response</Button>
          </div>
        </div>
      </Modal>

      {/* Add Scheduled Modal */}
      <Modal open={showAddScheduled} onClose={() => setShowAddScheduled(false)} title="Add Scheduled Message">
        <div className="space-y-4">
          <Input
            label="Channel ID"
            placeholder="Channel to send the message"
            value={newScheduled.channelId}
            onChange={(e) => setNewScheduled({ ...newScheduled, channelId: e.target.value })}
          />
          <Input
            label="Cron Schedule"
            placeholder="0 9 * * * (every day at 9 AM)"
            value={newScheduled.cron}
            onChange={(e) => setNewScheduled({ ...newScheduled, cron: e.target.value })}
          />
          <Textarea
            label="Message"
            placeholder="Good morning everyone!"
            value={newScheduled.message}
            onChange={(e) => setNewScheduled({ ...newScheduled, message: e.target.value })}
          />
          <p className="text-xs text-discord-muted">
            Cron format: minute hour day month weekday. Example: "0 9 * * 1-5" = weekdays at 9 AM.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setShowAddScheduled(false)}>Cancel</Button>
            <Button onClick={addScheduledMsg} loading={addingScheduled}>Add Message</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Response Modal */}
      <Modal open={!!editResponse} onClose={() => setEditResponse(null)} title="Edit Auto-Response">
        <div className="space-y-4">
          <Input
            label="Trigger"
            placeholder="hello"
            value={editResponseData.trigger}
            onChange={(e) => setEditResponseData({ ...editResponseData, trigger: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-discord-muted mb-1.5">Match Mode</label>
            <div className="flex gap-2">
              {['contains', 'exact', 'startsWith'].map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={editResponseData.matchMode === mode ? 'primary' : 'secondary'}
                  onClick={() => setEditResponseData({ ...editResponseData, matchMode: mode })}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>
          <Textarea
            label="Response"
            placeholder="Hey there! How can I help?"
            value={editResponseData.response}
            onChange={(e) => setEditResponseData({ ...editResponseData, response: e.target.value })}
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setEditResponse(null)}>Cancel</Button>
            <Button onClick={saveEditResponse} loading={savingResponse}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Scheduled Modal */}
      <Modal open={!!editScheduled} onClose={() => setEditScheduled(null)} title="Edit Scheduled Message">
        <div className="space-y-4">
          <Input
            label="Channel ID"
            placeholder="Channel to send the message"
            value={editScheduledData.channelId}
            onChange={(e) => setEditScheduledData({ ...editScheduledData, channelId: e.target.value })}
          />
          <Input
            label="Cron Schedule"
            placeholder="0 9 * * * (every day at 9 AM)"
            value={editScheduledData.cron}
            onChange={(e) => setEditScheduledData({ ...editScheduledData, cron: e.target.value })}
          />
          <Textarea
            label="Message"
            placeholder="Good morning everyone!"
            value={editScheduledData.message}
            onChange={(e) => setEditScheduledData({ ...editScheduledData, message: e.target.value })}
          />
          <p className="text-xs text-discord-muted">
            Cron format: minute hour day month weekday. Example: "0 9 * * 1-5" = weekdays at 9 AM.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setEditScheduled(null)}>Cancel</Button>
            <Button onClick={saveEditScheduled} loading={savingScheduled}>Save Changes</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          if (deleteTarget.type === 'response') deleteResponse(deleteTarget.id);
          else deleteScheduledMsg(deleteTarget.id);
        }}
        title={deleteTarget?.type === 'response' ? 'Delete Auto-Response' : 'Delete Scheduled Message'}
        message={deleteTarget?.type === 'response'
          ? 'Are you sure you want to delete this auto-response?'
          : 'Are you sure you want to delete this scheduled message?'
        }
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
