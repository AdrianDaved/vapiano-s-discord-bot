import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { rifas, guilds } from '@/lib/api';
import Card from '@/components/Card';
import Loader from '@/components/Loader';
import Toggle from '@/components/Toggle';
import { Ticket, Settings, Gift, Trophy, Users, Clock, Send, Trash2, Shuffle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface RifaConfig {
  rifaEnabled: boolean;
  rifaCategoryId: string | null;
  rifaPanelChannelId: string | null;
  rifaPanelMessageId: string | null;
  rifaLogChannelId: string | null;
  rifaStaffRoleIds: string[];
}

interface Rifa {
  id: string;
  prize: string;
  description: string | null;
  maxSlots: number;
  filledCount: number;
  participants: string[];
  winnerIds: string[];
  winnersCount: number;
  endsAt: string | null;
  ended: boolean;
  cancelled: boolean;
  autoDrawOnFull: boolean;
  allowSelfJoin: boolean;
  hostId: string;
  createdAt: string;
}

interface Channel { id: string; name: string; type: number; }
interface Role    { id: string; name: string; color: number; }

function colorHex(c: number) {
  return c ? '#' + c.toString(16).padStart(6, '0') : '#99aab5';
}

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}

export default function Rifas() {
  const { guildId } = useParams<{ guildId: string }>();

  const [cfg, setCfg]             = useState<RifaConfig | null>(null);
  const [activeRifa, setActiveRifa] = useState<Rifa | null>(null);
  const [history, setHistory]     = useState<Rifa[]>([]);
  const [channels, setChannels]   = useState<Channel[]>([]);
  const [roles, setRoles]         = useState<Role[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [msg, setMsg]             = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Panel deploy form
  const [panelChannel, setPanelChannel]   = useState('');
  const [panelTitle, setPanelTitle]       = useState('🎟️ Rifas — Soporte');
  const [panelDesc, setPanelDesc]         = useState('Haz clic para solicitar tu número de rifa. El staff te atenderá en un canal privado.');
  const [panelBtnLabel, setPanelBtnLabel] = useState('🎫 Solicitar número');
  const [showHistory, setShowHistory]     = useState(false);

  const load = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const [cfgData, activeData, histData, chData, roleData] = await Promise.all([
        rifas.getConfig(guildId),
        rifas.list(guildId, 'active').then((r: Rifa[]) => r[0] ?? null),
        rifas.list(guildId, 'ended'),
        guilds.channels(guildId),
        guilds.roles(guildId),
      ]);
      setCfg(cfgData);
      setActiveRifa(activeData);
      setHistory(histData);
      setChannels((chData as Channel[]).filter((c: Channel) => c.type === 0));
      setRoles(roleData);
      if (cfgData.rifaPanelChannelId) setPanelChannel(cfgData.rifaPanelChannelId);
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || 'Error cargando datos' });
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => { load(); }, [load]);

  async function saveConfig(patch: Partial<RifaConfig>) {
    if (!guildId || !cfg) return;
    setSaving(true);
    setMsg(null);
    try {
      const updated = await rifas.updateConfig(guildId, patch);
      setCfg(prev => ({ ...prev!, ...updated }));
      setMsg({ type: 'ok', text: 'Configuración guardada.' });
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setSaving(false);
    }
  }

  async function deployPanel() {
    if (!guildId || !panelChannel) return;
    setDeploying(true);
    setMsg(null);
    try {
      const res = await rifas.deployPanel(guildId, {
        channelId:   panelChannel,
        title:       panelTitle,
        description: panelDesc,
        buttonLabel: panelBtnLabel,
        buttonColor: 3,
      });
      setCfg(prev => prev ? { ...prev, rifaPanelChannelId: res.channelId, rifaPanelMessageId: res.messageId } : prev);
      setMsg({ type: 'ok', text: `Panel enviado al canal. ID del mensaje: ${res.messageId}` });
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message });
    } finally {
      setDeploying(false);
    }
  }

  async function drawNow() {
    if (!guildId || !activeRifa) return;
    if (!confirm(`¿Sortear ahora la rifa "${activeRifa.prize}"?`)) return;
    try {
      await rifas.draw(guildId, activeRifa.id);
      setMsg({ type: 'ok', text: 'Sorteo realizado. El bot anunciará el ganador en Discord.' });
      await load();
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message });
    }
  }

  async function cancelRifa() {
    if (!guildId || !activeRifa) return;
    if (!confirm(`¿Cancelar la rifa "${activeRifa.prize}"?`)) return;
    try {
      await rifas.cancel(guildId, activeRifa.id);
      setMsg({ type: 'ok', text: 'Rifa cancelada.' });
      await load();
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message });
    }
  }

  if (loading) return <Loader text="Cargando rifas..." />;

  const textChannels = channels.filter(c => c.type === 0);
  const fillPct = activeRifa ? Math.round((activeRifa.filledCount / activeRifa.maxSlots) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-discord-white flex items-center gap-2">
            <Gift size={26} className="text-pink-400" /> Rifas
          </h1>
          <p className="text-discord-muted mt-1 text-sm">Gestiona rifas, configura el panel de tickets y monitorea el estado en tiempo real.</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-discord-lighter text-discord-muted hover:text-discord-white transition-colors" title="Recargar">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Alert */}
      {msg && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${msg.type === 'ok' ? 'bg-discord-green/20 text-discord-green' : 'bg-discord-red/20 text-discord-red'}`}>
          {msg.text}
        </div>
      )}

      {/* Active rifa status */}
      {activeRifa ? (
        <Card title="🎟️ Rifa activa">
          <div className="mt-3 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-discord-white">{activeRifa.prize}</h3>
                {activeRifa.description && <p className="text-discord-muted text-sm mt-1">{activeRifa.description}</p>}
              </div>
              <span className="flex-shrink-0 px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-xs font-semibold">ACTIVA</span>
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-discord-muted mb-1">
                <span>{activeRifa.filledCount} / {activeRifa.maxSlots} participantes</span>
                <span>{fillPct}%</span>
              </div>
              <div className="h-2 bg-discord-darker rounded-full overflow-hidden">
                <div className="h-full bg-pink-500 transition-all duration-500" style={{ width: fillPct + '%' }} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-discord-darker/60 text-center">
                <Users size={16} className="text-pink-400 mx-auto mb-1" />
                <p className="text-discord-white font-bold">{activeRifa.filledCount}/{activeRifa.maxSlots}</p>
                <p className="text-discord-muted text-xs">Participantes</p>
              </div>
              <div className="p-3 rounded-lg bg-discord-darker/60 text-center">
                <Trophy size={16} className="text-yellow-400 mx-auto mb-1" />
                <p className="text-discord-white font-bold">{activeRifa.winnersCount}</p>
                <p className="text-discord-muted text-xs">Ganadores</p>
              </div>
              <div className="p-3 rounded-lg bg-discord-darker/60 text-center">
                <Clock size={16} className="text-blue-400 mx-auto mb-1" />
                <p className="text-discord-white font-bold text-xs">{formatDate(activeRifa.endsAt)}</p>
                <p className="text-discord-muted text-xs">Sorteo</p>
              </div>
              <div className="p-3 rounded-lg bg-discord-darker/60 text-center">
                <Gift size={16} className="text-green-400 mx-auto mb-1" />
                <p className="text-discord-white font-bold text-xs">{activeRifa.autoDrawOnFull ? 'Auto' : 'Manual'}</p>
                <p className="text-discord-muted text-xs">Sorteo al llenar</p>
              </div>
            </div>

            {/* Participants preview */}
            <div>
              <p className="text-discord-muted text-xs mb-2 font-semibold uppercase tracking-wide">Participantes ({activeRifa.filledCount})</p>
              <div className="bg-discord-darker/60 rounded-lg p-3 font-mono text-xs text-discord-light max-h-40 overflow-y-auto">
                {activeRifa.participants.map((uid, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-discord-muted w-8 text-right flex-shrink-0">#{i + 1}</span>
                    <span className={uid ? 'text-pink-300' : 'text-discord-muted'}>{uid || '(libre)'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={drawNow}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm font-medium transition-colors"
              >
                <Shuffle size={15} /> Sortear ahora
              </button>
              <button
                onClick={cancelRifa}
                className="flex items-center gap-2 px-4 py-2 bg-discord-red/20 hover:bg-discord-red/30 text-discord-red rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 size={15} /> Cancelar rifa
              </button>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="🎟️ Rifa activa">
          <div className="py-6 text-center text-discord-muted">
            <Gift size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay ninguna rifa activa.</p>
            <p className="text-xs mt-1">Usa <code className="bg-discord-darker px-1 rounded">/rifa crear</code> en Discord para iniciar una.</p>
          </div>
        </Card>
      )}

      {/* Panel de tickets para rifas */}
      <Card title="🎫 Panel de tickets para rifas">
        <div className="mt-4 space-y-4">
          <p className="text-discord-muted text-sm">
            Despliega un botón en cualquier canal. Al hacer clic, el bot crea un canal privado en la categoría configurada donde el usuario puede pedir su número de rifa.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-discord-light mb-1 font-medium">Canal donde enviar el panel *</label>
              <select
                value={panelChannel}
                onChange={e => setPanelChannel(e.target.value)}
                className="w-full bg-discord-darker border border-discord-lighter/30 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple"
              >
                <option value="">Selecciona un canal</option>
                {textChannels.map(c => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-discord-light mb-1 font-medium">Título del embed</label>
              <input
                value={panelTitle}
                onChange={e => setPanelTitle(e.target.value)}
                className="w-full bg-discord-darker border border-discord-lighter/30 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple"
                placeholder="🎟️ Rifas — Soporte"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm text-discord-light mb-1 font-medium">Descripción del embed</label>
              <textarea
                value={panelDesc}
                onChange={e => setPanelDesc(e.target.value)}
                rows={2}
                className="w-full bg-discord-darker border border-discord-lighter/30 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple resize-none"
                placeholder="Haz clic para solicitar tu número..."
              />
            </div>

            <div>
              <label className="block text-sm text-discord-light mb-1 font-medium">Texto del botón</label>
              <input
                value={panelBtnLabel}
                onChange={e => setPanelBtnLabel(e.target.value)}
                className="w-full bg-discord-darker border border-discord-lighter/30 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple"
                placeholder="🎫 Solicitar número"
              />
            </div>

            {cfg?.rifaPanelMessageId && (
              <div className="sm:col-span-1 flex items-end">
                <div className="p-3 bg-discord-green/10 border border-discord-green/20 rounded-lg w-full">
                  <p className="text-discord-green text-xs font-semibold">✅ Panel activo</p>
                  <p className="text-discord-muted text-xs mt-0.5">Canal: {cfg.rifaPanelChannelId ? `<#${cfg.rifaPanelChannelId}>` : '—'}</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={deployPanel}
            disabled={deploying || !panelChannel}
            className="flex items-center gap-2 px-5 py-2.5 bg-discord-blurple hover:bg-discord-blurple/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Send size={15} />
            {deploying ? 'Enviando...' : cfg?.rifaPanelMessageId ? 'Reenviar panel' : 'Enviar panel'}
          </button>
        </div>
      </Card>

      {/* Configuración */}
      {cfg && (
        <Card title="⚙️ Configuración de rifas">
          <div className="mt-4 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-discord-white text-sm font-medium">Módulo de rifas</p>
                <p className="text-discord-muted text-xs">Activa o desactiva el sistema de rifas.</p>
              </div>
              <Toggle
                enabled={cfg.rifaEnabled}
                onChange={v => { setCfg(p => ({ ...p!, rifaEnabled: v })); saveConfig({ rifaEnabled: v }); }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-discord-light mb-1 font-medium">Categoría para tickets de rifa</label>
                <input
                  defaultValue={cfg.rifaCategoryId ?? '1489241433365024868'}
                  onBlur={e => saveConfig({ rifaCategoryId: e.target.value || null })}
                  className="w-full bg-discord-darker border border-discord-lighter/30 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple font-mono"
                  placeholder="ID de categoría"
                />
                <p className="text-discord-muted text-xs mt-1">Los canales de solicitud se crean aquí.</p>
              </div>

              <div>
                <label className="block text-sm text-discord-light mb-1 font-medium">Canal de logs de rifa</label>
                <select
                  defaultValue={cfg.rifaLogChannelId ?? ''}
                  onBlur={e => saveConfig({ rifaLogChannelId: e.target.value || null })}
                  className="w-full bg-discord-darker border border-discord-lighter/30 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:border-discord-blurple"
                >
                  <option value="">Sin log</option>
                  {textChannels.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm text-discord-light mb-1 font-medium">Roles de staff para rifas</label>
                <div className="flex flex-wrap gap-2">
                  {roles.filter(r => r.name !== '@everyone').map(r => {
                    const isSelected = cfg.rifaStaffRoleIds.includes(r.id);
                    return (
                      <button
                        key={r.id}
                        onClick={() => {
                          const next = isSelected
                            ? cfg.rifaStaffRoleIds.filter(id => id !== r.id)
                            : [...cfg.rifaStaffRoleIds, r.id];
                          setCfg(p => ({ ...p!, rifaStaffRoleIds: next }));
                          saveConfig({ rifaStaffRoleIds: next });
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${isSelected ? 'border-transparent text-white' : 'border-discord-lighter/30 text-discord-muted hover:text-discord-white'}`}
                        style={isSelected ? { backgroundColor: colorHex(r.color) + '40', borderColor: colorHex(r.color), color: colorHex(r.color) } : {}}
                      >
                        {isSelected ? '✓ ' : ''}{r.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-discord-muted text-xs mt-1">Estos roles pueden ver los canales de solicitud de rifa y usar comandos de staff.</p>
              </div>
            </div>

            {saving && <p className="text-discord-muted text-xs">Guardando...</p>}
          </div>
        </Card>
      )}

      {/* Historial */}
      <Card title={`📋 Historial (${history.length} rifas finalizadas)`}>
        <button
          onClick={() => setShowHistory(h => !h)}
          className="mt-3 flex items-center gap-1 text-discord-muted text-sm hover:text-discord-white transition-colors"
        >
          {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {showHistory ? 'Ocultar historial' : 'Ver historial'}
        </button>

        {showHistory && (
          <div className="mt-3 space-y-2">
            {history.length === 0 && (
              <p className="text-discord-muted text-sm py-4 text-center">No hay rifas en el historial.</p>
            )}
            {history.slice(0, 10).map(r => (
              <div key={r.id} className="p-3 rounded-lg bg-discord-darker/50 border border-discord-lighter/10 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-discord-white text-sm font-semibold truncate">{r.prize}</p>
                  <p className="text-discord-muted text-xs">
                    {r.filledCount}/{r.maxSlots} participantes ·{' '}
                    {r.winnerIds.length > 0 ? `${r.winnerIds.length} ganador(es)` : 'Sin ganadores'} ·{' '}
                    {formatDate(r.endsAt ?? r.createdAt)}
                  </p>
                </div>
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${r.cancelled ? 'bg-discord-red/20 text-discord-red' : 'bg-discord-green/20 text-discord-green'}`}>
                  {r.cancelled ? 'Cancelada' : 'Finalizada'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
