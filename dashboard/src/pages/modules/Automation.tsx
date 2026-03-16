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
      toast.success('Autorespuesta agregada');
    } catch {
      toast.error('No se pudo agregar la respuesta');
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
      toast.success('Respuesta eliminada');
    } catch {
      toast.error('No se pudo eliminar');
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
      toast.success('Mensaje programado agregado');
    } catch {
      toast.error('No se pudo agregar el mensaje programado');
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
      toast.success('Mensaje programado eliminado');
    } catch {
      toast.error('No se pudo eliminar');
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
      toast.success('Autorespuesta actualizada');
    } catch {
      toast.error('No se pudo actualizar la respuesta');
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
      toast.success('Mensaje programado actualizado');
    } catch {
      toast.error('No se pudo actualizar el mensaje programado');
    } finally {
      setSavingScheduled(false);
    }
  };

  const toggleResponseEnabled = async (r: AutoResponse) => {
    if (!guildId) return;
    try {
      await autoApi.updateResponse(guildId, r.id, { enabled: !r.enabled });
      setResponses((prev) => prev.map((item) => item.id === r.id ? { ...item, enabled: !item.enabled } : item));
      toast.success(`Respuesta ${!r.enabled ? 'activada' : 'desactivada'}`);
    } catch {
      toast.error('No se pudo cambiar el estado de la respuesta');
    }
  };

  if (configLoading || loading) return <Loader text="Cargando automatizacion..." />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Automatizacion</h1>
        <p className="text-discord-muted mt-1">Autorespuestas y mensajes programados</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={tab === 'responses' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTab('responses')}
        >
          <MessageSquare size={14} />
          Autorespuestas ({responses.length})
        </Button>
        <Button
          variant={tab === 'scheduled' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTab('scheduled')}
        >
          <Clock size={14} />
          Programados ({scheduled.length})
        </Button>
      </div>

      {/* Auto-Responses */}
      {tab === 'responses' && (
        <Card
          title="Autorespuestas"
          description="Responder automaticamente cuando coincide un disparador"
          action={
            <Button size="sm" onClick={() => setShowAddResponse(true)}>
              <Plus size={14} />
               Agregar respuesta
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
                     title={r.enabled ? 'Desactivar' : 'Activar'}
                  >
                    <ToggleLeft size={16} />
                  </button>
                ),
              },
              {
                key: 'trigger',
                 label: 'Disparador',
                render: (r: AutoResponse) => (
                  <code className="text-sm bg-discord-darker px-2 py-0.5 rounded">{r.trigger}</code>
                ),
              },
              {
                key: 'matchMode',
                 label: 'Modo',
                render: (r: AutoResponse) => (
                  <span className="text-xs text-discord-muted uppercase">{r.matchMode}</span>
                ),
              },
              {
                key: 'response',
                 label: 'Respuesta',
                render: (r: AutoResponse) => (
                  <span className="text-discord-muted truncate max-w-xs block">{r.response}</span>
                ),
              },
              {
                key: 'actions',
                label: '',
                render: (r: AutoResponse) => (
                  <div className="flex gap-1">
                    <button onClick={() => openEditResponse(r)} className="p-1 hover:text-discord-blurple text-discord-muted transition-colors" title="Editar">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleteTarget({ id: r.id, type: 'response' })} className="p-1 hover:text-discord-red text-discord-muted transition-colors" title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ),
              },
            ]}
            data={responses}
            emptyMessage="No hay autorespuestas configuradas."
          />
        </Card>
      )}

      {/* Scheduled Messages */}
      {tab === 'scheduled' && (
        <Card
          title="Mensajes programados"
          description="Enviar mensajes segun una programacion cron"
          action={
            <Button size="sm" onClick={() => setShowAddScheduled(true)}>
              <Plus size={14} />
               Agregar mensaje
            </Button>
          }
        >
          <Table
            columns={[
              {
                key: 'cron',
                 label: 'Programacion',
                render: (s: ScheduledMessage) => (
                  <code className="text-sm bg-discord-darker px-2 py-0.5 rounded">{s.cron}</code>
                ),
              },
              {
                key: 'channelId',
                 label: 'Canal',
                render: (s: ScheduledMessage) => (
                  <code className="text-xs text-discord-muted">{s.channelId}</code>
                ),
              },
              {
                key: 'message',
                 label: 'Mensaje',
                render: (s: ScheduledMessage) => (
                  <span className="text-discord-muted truncate max-w-xs block">{s.message}</span>
                ),
              },
              {
                key: 'actions',
                label: '',
                render: (s: ScheduledMessage) => (
                  <div className="flex gap-1">
                    <button onClick={() => openEditScheduled(s)} className="p-1 hover:text-discord-blurple text-discord-muted transition-colors" title="Editar">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setDeleteTarget({ id: s.id, type: 'scheduled' })} className="p-1 hover:text-discord-red text-discord-muted transition-colors" title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ),
              },
            ]}
            data={scheduled}
            emptyMessage="No hay mensajes programados."
          />
        </Card>
      )}

      {/* Add Response Modal */}
      <Modal open={showAddResponse} onClose={() => setShowAddResponse(false)} title="Agregar autorespuesta">
        <div className="space-y-4">
          <Input
            label="Disparador"
            placeholder="hola"
            value={newResponse.trigger}
            onChange={(e) => setNewResponse({ ...newResponse, trigger: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-discord-muted mb-1.5">Modo de coincidencia</label>
            <div className="flex gap-2">
              {[
                { value: 'contains', label: 'contiene' },
                { value: 'exact', label: 'exacto' },
                { value: 'startsWith', label: 'empieza con' },
              ].map((mode) => (
                <Button
                  key={mode.value}
                  size="sm"
                  variant={newResponse.matchMode === mode.value ? 'primary' : 'secondary'}
                  onClick={() => setNewResponse({ ...newResponse, matchMode: mode.value })}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>
          <Textarea
            label="Respuesta"
            placeholder="Hola! Como puedo ayudarte?"
            value={newResponse.response}
            onChange={(e) => setNewResponse({ ...newResponse, response: e.target.value })}
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setShowAddResponse(false)}>Cancelar</Button>
            <Button onClick={addResponse} loading={addingResponse}>Agregar respuesta</Button>
          </div>
        </div>
      </Modal>

      {/* Add Scheduled Modal */}
      <Modal open={showAddScheduled} onClose={() => setShowAddScheduled(false)} title="Agregar mensaje programado">
        <div className="space-y-4">
          <Input
            label="ID del canal"
            placeholder="Canal para enviar el mensaje"
            value={newScheduled.channelId}
            onChange={(e) => setNewScheduled({ ...newScheduled, channelId: e.target.value })}
          />
          <Input
            label="Programacion cron"
            placeholder="0 9 * * * (cada dia a las 9 AM)"
            value={newScheduled.cron}
            onChange={(e) => setNewScheduled({ ...newScheduled, cron: e.target.value })}
          />
          <Textarea
            label="Mensaje"
            placeholder="Buenos dias a todos!"
            value={newScheduled.message}
            onChange={(e) => setNewScheduled({ ...newScheduled, message: e.target.value })}
          />
          <p className="text-xs text-discord-muted">
            Formato cron: minuto hora dia mes dia-semana. Ejemplo: "0 9 * * 1-5" = dias laborables a las 9 AM.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setShowAddScheduled(false)}>Cancelar</Button>
            <Button onClick={addScheduledMsg} loading={addingScheduled}>Agregar mensaje</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Response Modal */}
      <Modal open={!!editResponse} onClose={() => setEditResponse(null)} title="Editar autorespuesta">
        <div className="space-y-4">
          <Input
            label="Disparador"
            placeholder="hola"
            value={editResponseData.trigger}
            onChange={(e) => setEditResponseData({ ...editResponseData, trigger: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-discord-muted mb-1.5">Modo de coincidencia</label>
            <div className="flex gap-2">
              {[
                { value: 'contains', label: 'contiene' },
                { value: 'exact', label: 'exacto' },
                { value: 'startsWith', label: 'empieza con' },
              ].map((mode) => (
                <Button
                  key={mode.value}
                  size="sm"
                  variant={editResponseData.matchMode === mode.value ? 'primary' : 'secondary'}
                  onClick={() => setEditResponseData({ ...editResponseData, matchMode: mode.value })}
                >
                  {mode.label}
                </Button>
              ))}
            </div>
          </div>
          <Textarea
            label="Respuesta"
            placeholder="Hola! Como puedo ayudarte?"
            value={editResponseData.response}
            onChange={(e) => setEditResponseData({ ...editResponseData, response: e.target.value })}
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setEditResponse(null)}>Cancelar</Button>
            <Button onClick={saveEditResponse} loading={savingResponse}>Guardar cambios</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Scheduled Modal */}
      <Modal open={!!editScheduled} onClose={() => setEditScheduled(null)} title="Editar mensaje programado">
        <div className="space-y-4">
          <Input
            label="ID del canal"
            placeholder="Canal para enviar el mensaje"
            value={editScheduledData.channelId}
            onChange={(e) => setEditScheduledData({ ...editScheduledData, channelId: e.target.value })}
          />
          <Input
            label="Programacion cron"
            placeholder="0 9 * * * (cada dia a las 9 AM)"
            value={editScheduledData.cron}
            onChange={(e) => setEditScheduledData({ ...editScheduledData, cron: e.target.value })}
          />
          <Textarea
            label="Mensaje"
            placeholder="Buenos dias a todos!"
            value={editScheduledData.message}
            onChange={(e) => setEditScheduledData({ ...editScheduledData, message: e.target.value })}
          />
          <p className="text-xs text-discord-muted">
            Formato cron: minuto hora dia mes dia-semana. Ejemplo: "0 9 * * 1-5" = dias laborables a las 9 AM.
          </p>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setEditScheduled(null)}>Cancelar</Button>
            <Button onClick={saveEditScheduled} loading={savingScheduled}>Guardar cambios</Button>
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
        title={deleteTarget?.type === 'response' ? 'Eliminar autorespuesta' : 'Eliminar mensaje programado'}
        message={deleteTarget?.type === 'response'
          ? 'Seguro que quieres eliminar esta autorespuesta?'
          : 'Seguro que quieres eliminar este mensaje programado?'
        }
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
