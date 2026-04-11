import { useEffect, useState, useCallback } from 'react';
import { useGuild } from '@/hooks/useGuild';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { tickets as ticketsApi, guilds as guildsApi } from '@/lib/api';
import Card from '@/components/Card';
import Table from '@/components/Table';
import Button from '@/components/Button';
import Input, { Textarea, Select } from '@/components/Input';
import Modal from '@/components/Modal';
import Toggle from '@/components/Toggle';
import Loader from '@/components/Loader';
import StatCard from '@/components/StatCard';
import EmojiInput from '@/components/EmojiInput';
import ColorInput from '@/components/ColorInput';
import VariableTextarea from '@/components/VariableTextarea';
import DiscordEmbedPreview from '@/components/DiscordEmbedPreview';
import toast from 'react-hot-toast';
import {
  Ticket, FolderOpen, FolderClosed, Plus, Trash2, FileText,
  Settings, Star, TrendingUp, Edit3, Eye, Download, ChevronLeft, ChevronRight,
  AlertTriangle, Search, X, Copy,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────
interface TicketPanel {
  id: string;
  name: string;
  channelId: string;
  messageId?: string;
  title: string;
  description: string;
  embedColor: string;
  footerText?: string;
  buttonLabel: string;
  buttonEmoji?: string;
  buttonColor: string;
  style: string;
  categoryId?: string;
  closedCategoryId?: string;
  namingPattern: string;
  staffRoleIds: string[];
  adminRoleIds: string[];
  ticketLimit: number;
  mentionStaff: boolean;
  mentionCreator: boolean;
  welcomeTitle?: string;
  welcomeMessage?: string;
  welcomeColor: string;
  closeRequestEnabled: boolean;
  closeRequestMessage?: string;
  claimEnabled: boolean;
  claimLockOthers: boolean;
  transcriptEnabled: boolean;
  transcriptChannelId?: string;
  transcriptDMUser: boolean;
  transcriptDMStaff: boolean;
  logChannelId?: string;
  showCloseButton: boolean;
  showClaimButton: boolean;
  showTranscriptButton: boolean;
  formEnabled: boolean;
  formTitle?: string;
  formQuestions?: FormQuestion[];
  escalatePanelId?: string;
  feedbackEnabled: boolean;
  feedbackMessage?: string;
  autoCloseHours: number;
  panelAutoRepost: boolean;
  panelAutoRepostCooldown: number;
  panelAutoRepostIgnoreBots: boolean;
  groupEmbedTitle?: string;
  groupEmbedDescription?: string;
  groupEmbedColor?: string;
  createdAt: string;
  _count?: { tickets: number; transcripts: number };
}

interface FormQuestion {
  label: string;
  placeholder?: string;
  style: 'short' | 'paragraph';
  required: boolean;
  minLength?: number;
  maxLength?: number;
}

interface TicketEntry {
  id: string;
  channelId: string;
  userId: string;
  number: number;
  status: string;
  topic?: string;
  claimedBy?: string;
  closedBy?: string;
  closeReason?: string;
  priority: string;
  rating?: number;
  createdAt: string;
  closedAt?: string;
  panel?: { id: string; name: string; title: string };
}

interface TicketStats {
  open: number;
  closed: number;
  total: number;
  panels: number;
  transcripts: number;
  thisWeek: number;
  avgRating: number | null;
}

interface TranscriptEntry {
  id: string;
  ticketId: string;
  userId: string;
  closedBy?: string;
  messageCount: number;
  createdAt: string;
  ticket?: { number: number; status: string; userId: string };
}

// ─── Tabs ────────────────────────────────────────────────
type Tab = 'overview' | 'panels' | 'tickets' | 'transcripts';

// ─── Channel Select helper ───────────────────────────────
function ChannelSelect({
  label,
  description,
  channels,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  channels: { id: string; name: string; type: number; parentId: string | null }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const textChannels = channels.filter((c) => c.type === 0 || c.type === 5);
  const opts = [{ value: '', label: 'Sin canal (desactivado)' }, ...textChannels.map((c) => ({ value: c.id, label: `#${c.name}` }))];
  return (
    <div>
      <Select label={label} options={opts} value={value} onChange={(e) => onChange(e.target.value)} />
      {description && <p className="text-xs text-discord-muted mt-1">{description}</p>}
    </div>
  );
}

// ─── Role Multi-Select helper ────────────────────────────
function RoleMultiSelect({
  label,
  description,
  roles,
  selected,
  onChange,
}: {
  label: string;
  description?: string;
  roles: { id: string; name: string; color: number }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [addingRole, setAddingRole] = useState('');
  const selectedRoles = selected.map((id) => roles.find((r) => r.id === id) || { id, name: id, color: 0 });

  const add = (id: string) => {
    if (id && !selected.includes(id)) onChange([...selected, id]);
    setAddingRole('');
  };
  const remove = (id: string) => onChange(selected.filter((r) => r !== id));

  const availableRoles = roles.filter((r) => !selected.includes(r.id));

  return (
    <div>
      <p className="block text-sm font-medium text-discord-muted mb-1.5">{label}</p>
      {selectedRoles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedRoles.map((r) => (
            <span
              key={r.id}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-discord-lighter text-discord-white"
              style={r.color ? { backgroundColor: `#${r.color.toString(16).padStart(6, '0')}22`, borderColor: `#${r.color.toString(16).padStart(6, '0')}`, border: '1px solid' } : {}}
            >
              {r.name}
              <button onClick={() => remove(r.id)} className="ml-1 hover:text-discord-red transition-colors"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      {availableRoles.length > 0 ? (
        <div className="flex gap-2">
          <select
            className="flex-1 bg-discord-darker border border-discord-lighter/30 rounded-md px-3 py-2 text-sm text-discord-white focus:outline-none focus:border-discord-blurple"
            value={addingRole}
            onChange={(e) => setAddingRole(e.target.value)}
          >
            <option value="">Seleccionar rol para agregar...</option>
            {availableRoles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <button
            onClick={() => add(addingRole)}
            disabled={!addingRole}
            className="px-3 py-2 rounded-md bg-discord-blurple text-white text-sm font-medium disabled:opacity-40 hover:bg-discord-blurple/80 transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>
      ) : (
        <p className="text-xs text-discord-muted italic">No hay más roles disponibles</p>
      )}
      {description && <p className="text-xs text-discord-muted mt-1">{description}</p>}
    </div>
  );
}

// ─── Variable constants ──────────────────────────────────
const TICKET_VARS = [
  { tag: '{user}', description: 'Mención del creador del ticket' },
  { tag: '{username}', description: 'Username del creador' },
  { tag: '{number}', description: 'Número del ticket' },
  { tag: '{panel}', description: 'Nombre del panel' },
];

const NAMING_VARS = [
  { tag: '{number}', description: 'Número secuencial' },
  { tag: '{username}', description: 'Username del creador' },
  { tag: '{displayname}', description: 'Nombre visible del creador' },
  { tag: '{panel}', description: 'Nombre del panel' },
];

// ─── Default Panel Data ──────────────────────────────────
const DEFAULT_PANEL: Partial<TicketPanel> = {
  name: 'Predeterminado',
  title: 'Tickets de soporte',
  description: 'Haz clic en el boton de abajo para crear un ticket.',
  embedColor: '#5865F2',
  buttonLabel: 'Crear ticket',
  buttonEmoji: '🎫',
  buttonColor: 'Primary',
  style: 'button',
  namingPattern: 'ticket-{number}',
  staffRoleIds: [],
  adminRoleIds: [],
  ticketLimit: 1,
  mentionStaff: true,
  mentionCreator: true,
  welcomeTitle: 'Ticket abierto',
  welcomeMessage: 'Bienvenido! Describe tu problema.\nUn miembro del staff te ayudara pronto.',
  welcomeColor: '#5865F2',
  closeRequestEnabled: true,
  closeRequestMessage: 'Seguro que quieres cerrar este ticket?',
  claimEnabled: true,
  claimLockOthers: false,
  transcriptEnabled: true,
  transcriptDMUser: true,
  transcriptDMStaff: false,
  showCloseButton: true,
  showClaimButton: true,
  showTranscriptButton: true,
  formEnabled: false,
  formTitle: 'Formulario de ticket',
  formQuestions: [],
  feedbackEnabled: false,
  feedbackMessage: 'Como calificarias el soporte que recibiste?',
  autoCloseHours: 0,
  panelAutoRepost: false,
  panelAutoRepostCooldown: 5,
  panelAutoRepostIgnoreBots: true,
};

// ─── Priority helpers ────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-discord-muted',
  normal: 'text-discord-white',
  high: 'text-yellow-400',
  urgent: 'text-discord-red',
};

const PRIORITY_OPTIONS = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'low', label: 'Baja' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'open', label: 'Abierto' },
  { value: 'closed', label: 'Cerrado' },
];

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function Tickets() {
  const { guildId, loading: configLoading } = useGuild();
  const [tab, setTab] = useState<Tab>('overview');

  // Data
  const [ticketStats, setTicketStats] = useState<TicketStats | null>(null);
  const [panels, setPanels] = useState<TicketPanel[]>([]);
  const [ticketList, setTicketList] = useState<TicketEntry[]>([]);
  const [ticketTotal, setTicketTotal] = useState(0);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketPages, setTicketPages] = useState(1);
  const [transcriptList, setTranscriptList] = useState<TranscriptEntry[]>([]);
  const [transcriptTotal, setTranscriptTotal] = useState(0);
  const [transcriptPage, setTranscriptPage] = useState(1);
  const [transcriptPages, setTranscriptPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterPanel, setFilterPanel] = useState('');

  // Panel modal
  const [showPanelModal, setShowPanelModal] = useState(false);
  const [editingPanel, setEditingPanel] = useState<Partial<TicketPanel>>(DEFAULT_PANEL);
  const [editingPanelId, setEditingPanelId] = useState<string | null>(null);
  const [panelSection, setPanelSection] = useState<'general' | 'categories' | 'permissions' | 'messages' | 'buttons' | 'transcripts' | 'forms' | 'sticky' | 'advanced'>('general');
  const [savingPanel, setSavingPanel] = useState(false);
  const [syncingPanel, setSyncingPanel] = useState(false);

  // Guild channels + roles cache
  const [guildChannels, setGuildChannels] = useState<{ id: string; name: string; type: number; parentId: string | null }[]>([]);
  const [guildRoles, setGuildRoles] = useState<{ id: string; name: string; color: number }[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(false);

  // Deploy multi-panel
  const [deployChannelId, setDeployChannelId] = useLocalStorage(`${guildId}-deploy-channelId`, '');
  const [deployTitle, setDeployTitle] = useLocalStorage(`${guildId}-deploy-title`, 'SELECCIONAR EL BOTÓN QUE CORRESPONDA A TU CASO');
  const [deployDesc, setDeployDesc] = useLocalStorage(`${guildId}-deploy-desc`, '');
  const [deployColor, setDeployColor] = useLocalStorage(`${guildId}-deploy-color`, '#5865F2');
  const [deploySelected, setDeploySelected] = useLocalStorage<string[]>(`${guildId}-deploy-selected`, []);
  const [deploying, setDeploying] = useState(false);

  // Transcript viewer
  const [viewingTranscript, setViewingTranscript] = useState<any>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  // Quick emoji edit
  const [quickEmojiPanel, setQuickEmojiPanel] = useState<TicketPanel | null>(null);
  const [quickEmoji, setQuickEmoji] = useState('');
  const [savingQuickEmoji, setSavingQuickEmoji] = useState(false);

  // ─── Fetch overview data ─────────────────────────────
  const fetchOverview = useCallback(async () => {
    if (!guildId) return;
    try {
      const [statsData, panelsData] = await Promise.all([
        ticketsApi.stats(guildId).catch(() => null),
        ticketsApi.panels(guildId).catch(() => []),
      ]);
      if (statsData) setTicketStats(statsData);
      setPanels(panelsData);
    } catch { /* ignore */ }
  }, [guildId]);

  // ─── Fetch tickets ───────────────────────────────────
  const fetchTickets = useCallback(async (page = 1) => {
    if (!guildId) return;
    try {
      const params: any = { page, limit: 25 };
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;
      if (filterPanel) params.panelId = filterPanel;
      const data = await ticketsApi.list(guildId, params);
      setTicketList(data.tickets || []);
      setTicketTotal(data.total || 0);
      setTicketPage(data.page || 1);
      setTicketPages(data.pages || 1);
    } catch { /* ignore */ }
  }, [guildId, filterStatus, filterPriority, filterPanel]);

  // ─── Fetch transcripts ──────────────────────────────
  const fetchTranscripts = useCallback(async (page = 1) => {
    if (!guildId) return;
    try {
      const data = await ticketsApi.transcripts(guildId, { page, limit: 25 });
      setTranscriptList(data.transcripts || []);
      setTranscriptTotal(data.total || 0);
      setTranscriptPage(data.page || 1);
      setTranscriptPages(data.pages || 1);
    } catch { /* ignore */ }
  }, [guildId]);

  // ─── Initial load ────────────────────────────────────
  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    fetchOverview().finally(() => setLoading(false));
  }, [guildId, fetchOverview]);

  // Tab-specific data loading
  useEffect(() => {
    if (tab === 'tickets') fetchTickets(1);
    if (tab === 'transcripts') fetchTranscripts(1);
    if (tab === 'panels' && guildId && guildChannels.length === 0) {
      Promise.all([
        guildsApi.channels(guildId).catch(() => []),
        guildsApi.roles(guildId).catch(() => []),
      ]).then(([channels, roles]) => {
        setGuildChannels(channels);
        setGuildRoles(roles);
      });
    }
  }, [tab, fetchTickets, fetchTranscripts, guildId]);

  // ─── Fetch guild channels + roles when panel modal opens ─────
  useEffect(() => {
    if (!showPanelModal || !guildId) return;
    setLoadingChannels(true);
    Promise.all([
      guildsApi.channels(guildId).catch(() => []),
      guildsApi.roles(guildId).catch(() => []),
    ]).then(([channels, roles]) => {
      setGuildChannels(channels);
      setGuildRoles(roles);
    }).finally(() => setLoadingChannels(false));
  }, [showPanelModal, guildId]);

  // ─── Panel CRUD ──────────────────────────────────────
  const openNewPanel = () => {
    setEditingPanel({ ...DEFAULT_PANEL });
    setEditingPanelId(null);
    setPanelSection('general');
    setShowPanelModal(true);
  };

  const openEditPanel = (panel: TicketPanel) => {
    setEditingPanel({ ...panel });
    setEditingPanelId(panel.id);
    setPanelSection('general');
    setShowPanelModal(true);
  };

  const savePanel = async () => {
    if (!guildId) return;
    setSavingPanel(true);
    try {
      const { id: _id, guildId: _gid, createdAt: _ca, updatedAt: _ua, _count: _cnt, messageId: _mid, ...panelData } = editingPanel as any;
      if (editingPanelId) {
        const updated = await ticketsApi.updatePanel(guildId, editingPanelId, panelData);
        setPanels((prev) => prev.map((p) => (p.id === editingPanelId ? updated : p)));
          toast.success('Panel actualizado');
      } else {
        if (!panelData.channelId) {
          toast.error('El ID del canal es obligatorio');
          setSavingPanel(false);
          return;
        }
        const created = await ticketsApi.createPanel(guildId, panelData);
        setPanels((prev) => [...prev, created]);
        toast.success('Panel creado');
      }
      setShowPanelModal(false);
      fetchOverview();
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo guardar el panel');
    } finally {
      setSavingPanel(false);
    }
  };

  const syncPanel = async (id: string) => {
    if (!guildId) return;
    setSyncingPanel(true);
    try {
      await ticketsApi.syncPanel(guildId, id);
      toast.success('Mensaje de Discord actualizado');
    } catch (err: any) {
      toast.error(err?.message || 'No se pudo sincronizar con Discord');
    } finally {
      setSyncingPanel(false);
    }
  };

  const saveQuickEmoji = async () => {
    if (!guildId || !quickEmojiPanel) return;
    setSavingQuickEmoji(true);
    try {
      await ticketsApi.updatePanel(guildId, quickEmojiPanel.id, { buttonEmoji: quickEmoji });
      setPanels(prev => prev.map(p => p.id === quickEmojiPanel.id ? { ...p, buttonEmoji: quickEmoji } : p));
      setQuickEmojiPanel(null);
      toast.success('Emoji actualizado');
    } catch {
      toast.error('No se pudo actualizar el emoji');
    } finally {
      setSavingQuickEmoji(false);
    }
  };

  const handleDeploy = async () => {
    if (!guildId) return;
    if (!deployChannelId.trim()) { toast.error('Ingresa el ID del canal'); return; }
    if (deploySelected.length === 0) { toast.error('Selecciona al menos un panel'); return; }
    if (deploySelected.length > 5) { toast.error('Máximo 5 botones por panel'); return; }
    setDeploying(true);
    try {
      await ticketsApi.deployPanels(guildId, {
        channelId: deployChannelId.trim(),
        embedTitle: deployTitle,
        embedDescription: deployDesc,
        embedColor: deployColor,
        panelIds: deploySelected,
      });
      toast.success('Panel desplegado en Discord');
      setDeploySelected([]);
    } catch (err: any) {
      toast.error(err.message || 'Error al desplegar el panel');
    } finally {
      setDeploying(false);
    }
  };

  const deletePanel = async (id: string) => {
    if (!guildId) return;
    try {
      await ticketsApi.deletePanel(guildId, id);
      setPanels((prev) => prev.filter((p) => p.id !== id));
      toast.success('Panel eliminado');
      fetchOverview();
    } catch {
      toast.error('No se pudo eliminar el panel');
    }
  };

  const copyPanel = async (panel: TicketPanel) => {
    if (!guildId) return;
    try {
      const { id: _id, guildId: _gid, createdAt: _ca, _count: _cnt, messageId: _mid, ...panelData } = panel as any;
      const created = await ticketsApi.createPanel(guildId, { ...panelData, name: `Copia de ${panel.name}` });
      setPanels((prev) => [...prev, created]);
      toast.success('Panel duplicado');
    } catch (err: any) {
      toast.error(err.message || 'Error al duplicar');
    }
  };

  // ─── View transcript ─────────────────────────────────
  const viewTranscript = async (id: string) => {
    if (!guildId) return;
    setLoadingTranscript(true);
    try {
      const data = await ticketsApi.getTranscript(guildId, id);
      setViewingTranscript(data);
    } catch {
      toast.error('No se pudo cargar la transcripcion');
    } finally {
      setLoadingTranscript(false);
    }
  };

  const downloadTranscriptHtml = (id: string) => {
    if (!guildId) return;
    const url = ticketsApi.getTranscriptHtmlUrl(guildId, id);
    const token = localStorage.getItem('token');
    window.open(`${url}?token=${token}`, '_blank');
  };

  // ─── Helper: update panel field ──────────────────────
  const updateField = (key: string, value: any) => {
    setEditingPanel((prev) => ({ ...prev, [key]: value }));
  };

  // ─── Loading state ───────────────────────────────────
  if (configLoading || loading) return <Loader text="Cargando tickets..." />;

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-discord-white">Sistema de tickets</h1>
        <p className="text-discord-muted mt-1">Administra paneles, revisa tickets y consulta transcripciones</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-discord-darker rounded-lg p-1">
        {([
          { key: 'overview', label: 'Resumen', icon: TrendingUp },
          { key: 'panels', label: 'Paneles', icon: Settings },
          { key: 'tickets', label: 'Tickets', icon: Ticket },
          { key: 'transcripts', label: 'Transcripciones', icon: FileText },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-discord-blurple text-white'
                : 'text-discord-muted hover:text-discord-white hover:bg-discord-lighter'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ═══════ OVERVIEW TAB ═══════ */}
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Tickets abiertos" value={ticketStats?.open ?? 0} icon={FolderOpen} color="text-discord-green" />
            <StatCard label="Tickets cerrados" value={ticketStats?.closed ?? 0} icon={FolderClosed} color="text-discord-muted" />
            <StatCard label="Esta semana" value={ticketStats?.thisWeek ?? 0} icon={TrendingUp} color="text-discord-blurple" />
            <StatCard label="Promedio" value={ticketStats?.avgRating ? `${ticketStats.avgRating}/5` : 'N/D'} icon={Star} color="text-yellow-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard label="Tickets totales" value={ticketStats?.total ?? 0} icon={Ticket} color="text-discord-blurple" />
            <StatCard label="Paneles" value={ticketStats?.panels ?? 0} icon={Settings} color="text-purple-400" />
            <StatCard label="Transcripciones" value={ticketStats?.transcripts ?? 0} icon={FileText} color="text-cyan-400" />
          </div>

          {/* Quick panel list */}
          <Card title="Paneles de tickets" description="Resumen rapido de paneles configurados">
            {panels.length === 0 ? (
              <div className="text-center py-8 text-discord-muted">
                <p>No hay paneles de tickets configurados.</p>
                <Button size="sm" className="mt-3" onClick={() => { setTab('panels'); openNewPanel(); }}>
                  <Plus size={14} /> Crear primer panel
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {panels.map((panel) => (
                  <div key={panel.id} className="flex items-center justify-between p-3 rounded-lg bg-discord-darker">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => { setQuickEmojiPanel(panel); setQuickEmoji(panel.buttonEmoji || ''); }}
                        title="Editar emoji"
                        className="text-xl hover:scale-110 transition-transform flex-shrink-0"
                      >
                        {panel.buttonEmoji || '🎫'}
                      </button>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-discord-white">{panel.name}</p>
                        <p className="text-xs text-discord-muted">{panel.title} &middot; {panel._count?.tickets ?? 0} tickets &middot; {panel._count?.transcripts ?? 0} transcripciones</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" title="Duplicar panel" onClick={() => copyPanel(panel)}>
                        <Copy size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setTab('panels'); openEditPanel(panel); }}>
                        <Edit3 size={14} />
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => deletePanel(panel.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ═══════ PANELS TAB ═══════ */}
      {tab === 'panels' && (
        <Card
          title="Paneles de tickets"
          description="Configura paneles con los que los usuarios interactuan para crear tickets"
          action={
            <Button size="sm" onClick={openNewPanel}>
              <Plus size={14} /> Nuevo panel
            </Button>
          }
        >
          {panels.length === 0 ? (
            <div className="text-center py-8 text-discord-muted">
              <p>Aun no hay paneles. Crea uno para empezar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {panels.map((panel) => (
                <div key={panel.id} className="flex items-center justify-between p-4 rounded-lg bg-discord-darker border border-discord-lighter/20">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: panel.embedColor || '#5865F2' }} />
                      <p className="text-sm font-semibold text-discord-white truncate">{panel.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-discord-lighter text-discord-muted">{panel.style}</span>
                    </div>
                    <p className="text-xs text-discord-muted mt-1 truncate">{panel.title} &middot; Canal: {panel.channelId}</p>
                    <div className="flex gap-3 mt-1 text-xs text-discord-muted">
                      <span>{panel._count?.tickets ?? 0} tickets</span>
                      <span>{panel._count?.transcripts ?? 0} transcripciones</span>
                      <span>Limite: {panel.ticketLimit}/usuario</span>
                      {panel.claimEnabled && <span>Asignacion ACTIVA</span>}
                      {panel.formEnabled && <span>Formulario ACTIVO</span>}
                      {panel.feedbackEnabled && <span>Feedback ACTIVO</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <button
                      onClick={() => { setQuickEmojiPanel(panel); setQuickEmoji(panel.buttonEmoji || ''); }}
                      className="px-2 py-1.5 rounded-md text-lg hover:bg-discord-lighter transition-colors"
                      title="Editar emoji rápido"
                    >
                      {panel.buttonEmoji || '🎫'}
                    </button>
                    <Button size="sm" variant="ghost" title="Duplicar panel" onClick={() => copyPanel(panel)}>
                      <Copy size={14} />
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => openEditPanel(panel)}>
                      <Edit3 size={14} /> Editar
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => deletePanel(panel.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ═══════ DEPLOY MULTI-PANEL ═══════ */}
      {tab === 'panels' && panels.length > 0 && (
        <Card
          title="Desplegar panel en Discord"
          description="Envía un mensaje con múltiples botones (uno por panel) a cualquier canal"
          className="mt-6"
        >
          <div className="space-y-4">
            {/* Channel + colors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                {guildChannels.length > 0 ? (
                  <Select
                    label="Canal de destino"
                    options={[
                      { value: '', label: 'Seleccionar canal...' },
                      ...guildChannels
                        .filter((c) => c.type === 0 || c.type === 5)
                        .map((c) => ({ value: c.id, label: `#${c.name}` })),
                    ]}
                    value={deployChannelId}
                    onChange={(e) => setDeployChannelId(e.target.value)}
                  />
                ) : (
                  <Input
                    label="ID del canal de destino"
                    placeholder="Ej. 1420907241124663297"
                    value={deployChannelId}
                    onChange={(e) => setDeployChannelId(e.target.value)}
                  />
                )}
              </div>
              <ColorInput
                label="Color del embed"
                value={deployColor}
                onChange={setDeployColor}
              />
            </div>

            {/* Embed texts */}
            <Input
              label="Título del embed"
              placeholder="SELECCIONAR EL BOTÓN QUE CORRESPONDA A TU CASO"
              value={deployTitle}
              onChange={(e) => setDeployTitle(e.target.value)}
            />
            <Textarea
              label="Descripción del embed"
              placeholder="Describe cada categoría aquí (opcional)..."
              value={deployDesc}
              onChange={(e) => setDeployDesc(e.target.value)}
              rows={4}
            />

            {/* Panel selector */}
            <div>
              <p className="text-sm font-medium text-discord-muted mb-2">
                Paneles a incluir como botones <span className="text-discord-muted/60">(máx. 5, en el orden seleccionado)</span>
              </p>
              <div className="space-y-2">
                {panels.map((panel) => {
                  const checked = deploySelected.includes(panel.id);
                  const idx = deploySelected.indexOf(panel.id);
                  return (
                    <label
                      key={panel.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        checked
                          ? 'border-discord-blurple bg-discord-blurple/10'
                          : 'border-discord-lighter/20 bg-discord-darker hover:border-discord-lighter/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            if (deploySelected.length < 5) setDeploySelected((prev) => [...prev, panel.id]);
                            else toast.error('Máximo 5 botones');
                          } else {
                            setDeploySelected((prev) => prev.filter((id) => id !== panel.id));
                          }
                        }}
                        className="accent-discord-blurple w-4 h-4"
                      />
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: panel.embedColor || '#5865F2' }}
                      />
                      <span className="text-sm font-medium text-discord-white flex-1">{panel.name}</span>
                      {panel.buttonEmoji && <span className="text-base">{panel.buttonEmoji}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        panel.buttonColor === 'Primary' ? 'bg-discord-blurple/30 text-discord-blurple' :
                        panel.buttonColor === 'Success' ? 'bg-green-500/20 text-green-400' :
                        panel.buttonColor === 'Danger' ? 'bg-discord-red/20 text-discord-red' :
                        'bg-discord-lighter text-discord-muted'
                      }`}>{panel.buttonColor}</span>
                      {checked && (
                        <span className="text-xs font-bold text-discord-blurple w-5 text-right">#{idx + 1}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Preview + deploy */}
            {deploySelected.length > 0 && (
              <div className="p-3 rounded-lg bg-discord-darker border border-discord-lighter/20">
                <p className="text-xs text-discord-muted mb-2">Vista previa de botones:</p>
                <div className="flex flex-wrap gap-2">
                  {deploySelected.map((id) => {
                    const p = panels.find((x) => x.id === id);
                    if (!p) return null;
                    return (
                      <span
                        key={id}
                        className={`px-3 py-1.5 rounded text-sm font-medium ${
                          p.buttonColor === 'Primary' ? 'bg-discord-blurple text-white' :
                          p.buttonColor === 'Success' ? 'bg-green-600 text-white' :
                          p.buttonColor === 'Danger' ? 'bg-red-600 text-white' :
                          'bg-discord-lighter text-discord-white'
                        }`}
                      >
                        {p.buttonEmoji} {p.buttonLabel || p.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleDeploy} loading={deploying} disabled={deploySelected.length === 0 || !deployChannelId.trim()}>
                Desplegar panel en Discord
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ═══════ TICKETS TAB ═══════ */}
      {tab === 'tickets' && (
        <Card title={`Tickets (${ticketTotal})`} description="Explora y filtra todos los tickets">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="w-40">
              <Select
                label="Estado"
                options={STATUS_OPTIONS}
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setTicketPage(1); }}
              />
            </div>
            <div className="w-40">
              <Select
                label="Prioridad"
                options={PRIORITY_OPTIONS}
                value={filterPriority}
                onChange={(e) => { setFilterPriority(e.target.value); setTicketPage(1); }}
              />
            </div>
            {panels.length > 0 && (
              <div className="w-48">
                <Select
                  label="Panel"
                  options={[{ value: '', label: 'Todos los paneles' }, ...panels.map((p) => ({ value: p.id, label: p.name }))]}
                  value={filterPanel}
                  onChange={(e) => { setFilterPanel(e.target.value); setTicketPage(1); }}
                />
              </div>
            )}
            <div className="flex items-end">
              <Button size="sm" variant="secondary" onClick={() => fetchTickets(ticketPage)}>
                <Search size={14} /> Buscar
              </Button>
            </div>
          </div>

          <Table
            columns={[
              {
                key: 'number',
                label: '#',
                render: (t: TicketEntry) => <span className="text-discord-blurple font-mono">#{t.number}</span>,
              },
              {
                key: 'status',
                label: 'Estado',
                render: (t: TicketEntry) => (
                  <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full ${
                    t.status === 'open' ? 'bg-discord-green/20 text-discord-green' : 'bg-discord-lighter text-discord-muted'
                  }`}>
                    {t.status}
                  </span>
                ),
              },
              {
                key: 'priority',
                label: 'Prioridad',
                render: (t: TicketEntry) => (
                  <span className={`text-xs font-medium uppercase ${PRIORITY_COLORS[t.priority] || 'text-discord-white'}`}>
                    {t.priority === 'urgent' && <AlertTriangle size={12} className="inline mr-1" />}
                    {t.priority}
                  </span>
                ),
              },
              { key: 'userId', label: 'Usuario', render: (t: TicketEntry) => <code className="text-xs text-discord-muted">{t.userId}</code> },
              {
                key: 'panel',
                label: 'Panel',
                render: (t: TicketEntry) => <span className="text-xs text-discord-muted">{t.panel?.name || '-'}</span>,
              },
              { key: 'claimedBy', label: 'Asignado', render: (t: TicketEntry) => <span className="text-xs text-discord-muted">{t.claimedBy || '-'}</span> },
              {
                key: 'rating',
                label: 'Valoracion',
                render: (t: TicketEntry) => t.rating ? (
                  <span className="text-yellow-400 text-xs">{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</span>
                ) : <span className="text-discord-muted text-xs">-</span>,
              },
              {
                key: 'createdAt',
                label: 'Creado',
                render: (t: TicketEntry) => <span className="text-xs text-discord-muted">{new Date(t.createdAt).toLocaleDateString()}</span>,
              },
            ]}
            data={ticketList}
            emptyMessage="Ningun ticket coincide con tus filtros."
          />

          {/* Pagination */}
          {ticketPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-discord-lighter">
              <span className="text-xs text-discord-muted">Pagina {ticketPage} de {ticketPages} ({ticketTotal} total)</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={ticketPage <= 1} onClick={() => fetchTickets(ticketPage - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                <Button size="sm" variant="secondary" disabled={ticketPage >= ticketPages} onClick={() => fetchTickets(ticketPage + 1)}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ═══════ TRANSCRIPTS TAB ═══════ */}
      {tab === 'transcripts' && (
        <Card title={`Transcripciones (${transcriptTotal})`} description="Explora transcripciones guardadas de tickets">
          <Table
            columns={[
              {
                key: 'ticket',
                label: 'Ticket',
                render: (t: TranscriptEntry) => <span className="text-discord-blurple font-mono">#{t.ticket?.number ?? '?'}</span>,
              },
              { key: 'userId', label: 'Creador', render: (t: TranscriptEntry) => <code className="text-xs text-discord-muted">{t.userId}</code> },
              { key: 'closedBy', label: 'Cerrado por', render: (t: TranscriptEntry) => <code className="text-xs text-discord-muted">{t.closedBy || '-'}</code> },
              { key: 'messageCount', label: 'Mensajes', render: (t: TranscriptEntry) => <span className="text-sm">{t.messageCount}</span> },
              {
                key: 'createdAt',
                label: 'Fecha',
                render: (t: TranscriptEntry) => <span className="text-xs text-discord-muted">{new Date(t.createdAt).toLocaleDateString()}</span>,
              },
              {
                key: 'actions',
                label: '',
                render: (t: TranscriptEntry) => (
                  <div className="flex gap-1">
                    <button
                      onClick={() => viewTranscript(t.id)}
                      className="p-1.5 hover:bg-discord-lighter rounded text-discord-muted hover:text-discord-white transition-colors"
                      title="Ver mensajes"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => downloadTranscriptHtml(t.id)}
                      className="p-1.5 hover:bg-discord-lighter rounded text-discord-muted hover:text-discord-white transition-colors"
                      title="Descargar HTML"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                ),
              },
            ]}
            data={transcriptList}
            emptyMessage="Aun no hay transcripciones."
          />

          {/* Pagination */}
          {transcriptPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-discord-lighter">
              <span className="text-xs text-discord-muted">Pagina {transcriptPage} de {transcriptPages} ({transcriptTotal} total)</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={transcriptPage <= 1} onClick={() => fetchTranscripts(transcriptPage - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                <Button size="sm" variant="secondary" disabled={transcriptPage >= transcriptPages} onClick={() => fetchTranscripts(transcriptPage + 1)}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ═══════ PANEL CREATE/EDIT MODAL ═══════ */}
      <Modal
        open={showPanelModal}
        onClose={() => setShowPanelModal(false)}
        title={editingPanelId ? 'Editar panel' : 'Crear panel'}
        maxWidth="max-w-3xl"
      >
        {/* Section tabs */}
        <div className="flex flex-wrap gap-1 mb-4 -mt-1">
          {([
            { key: 'general', label: 'General' },
            { key: 'categories', label: 'Categorias' },
            { key: 'permissions', label: 'Permisos' },
            { key: 'messages', label: 'Mensajes' },
            { key: 'buttons', label: 'Botones' },
            { key: 'transcripts', label: 'Transcripciones' },
            { key: 'forms', label: 'Formularios' },
            { key: 'sticky', label: 'Panel Fijo' },
            { key: 'advanced', label: 'Avanzado' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPanelSection(key)}
              className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                panelSection === key
                  ? 'bg-discord-blurple text-white'
                  : 'text-discord-muted hover:text-discord-white hover:bg-discord-lighter'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {loadingChannels && (
          <p className="text-xs text-discord-muted mb-3 flex items-center gap-1">
            <span className="animate-spin inline-block w-3 h-3 border-2 border-discord-blurple border-t-transparent rounded-full" />
            Cargando canales y roles del servidor...
          </p>
        )}

        <div className="space-y-4">
          {/* ─── General ─── */}
          {panelSection === 'general' && (
            <>
              <Input
                label="Nombre del panel (interno)"
                placeholder="ej. Soporte general"
                value={editingPanel.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
              />
              <Select
                label="Canal"
                options={[
                  { value: '', label: 'Seleccionar canal...' },
                  ...guildChannels
                    .filter((c) => c.type === 0 || c.type === 5)
                    .map((c) => ({ value: c.id, label: `#${c.name}` })),
                ]}
                value={editingPanel.channelId || ''}
                onChange={(e) => updateField('channelId', e.target.value || null)}
              />
              <Input
                label="Titulo del embed"
                placeholder="Tickets de soporte"
                value={editingPanel.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
              />
              <VariableTextarea
                label="Descripcion del embed"
                value={editingPanel.description || ''}
                onChange={(v) => updateField('description', v)}
                variables={TICKET_VARS}
                placeholder="Haz clic en el boton de abajo para crear un ticket."
                rows={3}
                maxLength={4096}
              />
              <div className="grid grid-cols-2 gap-4">
                <ColorInput
                  label="Color del embed"
                  value={editingPanel.embedColor || '#5865F2'}
                  onChange={(v) => updateField('embedColor', v)}
                />
                <Input
                  label="Texto del pie"
                  placeholder="Pie opcional"
                  value={editingPanel.footerText || ''}
                  onChange={(e) => updateField('footerText', e.target.value)}
                />
              </div>
              <DiscordEmbedPreview
                title={editingPanel.title}
                description={editingPanel.description}
                color={editingPanel.embedColor}
                footerText={editingPanel.footerText}
              />
              {editingPanelId && (
                <div className="p-3 rounded-xl bg-discord-darker border border-discord-lighter/20">
                  <p className="text-xs text-discord-muted mb-3">Embed del grupo (mensaje compartido con otros botones)</p>
                  <div className="space-y-3">
                    <input
                      className="w-full bg-discord-dark border border-discord-lighter/40 rounded-lg px-3 py-2 text-discord-white text-sm focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                      placeholder="Titulo del embed del grupo"
                      value={(editingPanel as any).groupEmbedTitle || ''}
                      onChange={(e) => updateField('groupEmbedTitle', e.target.value)}
                    />
                    <textarea
                      className="w-full h-24 bg-discord-dark border border-discord-lighter/40 rounded-lg px-3 py-2 text-discord-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-discord-blurple/50"
                      placeholder="Descripcion del embed del grupo"
                      value={(editingPanel as any).groupEmbedDescription || ''}
                      onChange={(e) => updateField('groupEmbedDescription', e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Estilo"
                  options={[
                    { value: 'button', label: 'Boton' },
                    { value: 'dropdown', label: 'Menu desplegable' },
                    { value: 'command', label: 'Solo comando' },
                  ]}
                  value={editingPanel.style || 'button'}
                  onChange={(e) => updateField('style', e.target.value)}
                />
                <div>
                  <Input
                    label="Patron de nombre"
                    placeholder="ticket-{number}"
                    value={editingPanel.namingPattern || ''}
                    onChange={(e) => updateField('namingPattern', e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {NAMING_VARS.map(v => (
                      <button
                        key={v.tag}
                        onClick={() => updateField('namingPattern', (editingPanel.namingPattern || '') + v.tag)}
                        title={v.description}
                        className="text-xs px-1.5 py-0.5 rounded bg-discord-blurple/20 text-discord-blurple border border-discord-blurple/30 hover:bg-discord-blurple/30 transition-colors font-mono"
                      >
                        {v.tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Input
                label="Maximo de tickets abiertos por usuario"
                type="number"
                min={1}
                max={25}
                value={editingPanel.ticketLimit ?? 1}
                onChange={(e) => updateField('ticketLimit', parseInt(e.target.value) || 1)}
              />
            </>
          )}

          {/* ─── Categories ─── */}
          {panelSection === 'categories' && (
            <>
              <Select
                label="Categoria de tickets abiertos"
                options={[
                  { value: '', label: 'Sin categoría' },
                  ...guildChannels
                    .filter((c) => c.type === 4)
                    .map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={editingPanel.categoryId || ''}
                onChange={(e) => updateField('categoryId', e.target.value || null)}
              />
              <Select
                label="Categoria de tickets cerrados"
                options={[
                  { value: '', label: 'Sin categoría' },
                  ...guildChannels
                    .filter((c) => c.type === 4)
                    .map((c) => ({ value: c.id, label: c.name })),
                ]}
                value={editingPanel.closedCategoryId || ''}
                onChange={(e) => updateField('closedCategoryId', e.target.value || null)}
              />
              <p className="text-xs text-discord-muted">
                Cuando se cierra un ticket, se puede mover a una categoria separada. Dejalo vacio para mantenerlo en la misma categoria.
              </p>
            </>
          )}

          {/* ─── Permissions ─── */}
          {panelSection === 'permissions' && (
            <>
              <RoleMultiSelect
                label="Roles del staff"
                description="El staff puede ver y responder en tickets."
                roles={guildRoles}
                selected={editingPanel.staffRoleIds || []}
                onChange={(v) => updateField('staffRoleIds', v)}
              />
              <RoleMultiSelect
                label="Roles admin"
                description="Los admins pueden eliminar tickets y administrar ajustes del panel."
                roles={guildRoles}
                selected={editingPanel.adminRoleIds || []}
                onChange={(v) => updateField('adminRoleIds', v)}
              />

              <div className="border-t border-discord-lighter pt-4 mt-4 space-y-3">
                <Toggle
                  label="Mencionar staff al abrir"
                  description="Mencionar roles de staff cuando se crea un ticket nuevo"
                  enabled={editingPanel.mentionStaff ?? true}
                  onChange={(v) => updateField('mentionStaff', v)}
                />
                <Toggle
                  label="Mencionar creador"
                  description="Mencionar al creador del ticket en el mensaje de bienvenida"
                  enabled={editingPanel.mentionCreator ?? true}
                  onChange={(v) => updateField('mentionCreator', v)}
                />
              </div>
            </>
          )}

          {/* ─── Messages ─── */}
          {panelSection === 'messages' && (
            <>
              <Input
                label="Titulo del embed de bienvenida"
                placeholder="Ticket abierto"
                value={editingPanel.welcomeTitle || ''}
                onChange={(e) => updateField('welcomeTitle', e.target.value)}
              />
              <VariableTextarea
                label="Mensaje de bienvenida"
                value={editingPanel.welcomeMessage || ''}
                onChange={(v) => updateField('welcomeMessage', v)}
                variables={TICKET_VARS}
                placeholder="Bienvenido {user}! Describe tu problema."
                rows={4}
                maxLength={2000}
              />
              <ColorInput
                label="Color del embed de bienvenida"
                value={editingPanel.welcomeColor || '#5865F2'}
                onChange={(v) => updateField('welcomeColor', v)}
              />
              <DiscordEmbedPreview
                title={editingPanel.welcomeTitle}
                description={editingPanel.welcomeMessage}
                color={editingPanel.welcomeColor}
              />

              <div className="border-t border-discord-lighter pt-4 mt-4 space-y-3">
                <Toggle
                  label="Confirmacion al cerrar"
                  description="Pedir confirmacion antes de cerrar un ticket"
                  enabled={editingPanel.closeRequestEnabled ?? true}
                  onChange={(v) => updateField('closeRequestEnabled', v)}
                />
                {editingPanel.closeRequestEnabled && (
                  <Input
                    label="Mensaje de confirmacion de cierre"
                    placeholder="Seguro que quieres cerrar este ticket?"
                    value={editingPanel.closeRequestMessage || ''}
                    onChange={(e) => updateField('closeRequestMessage', e.target.value)}
                  />
                )}
              </div>

              <div className="border-t border-discord-lighter pt-4 mt-4 space-y-3">
                <Toggle
                  label="Feedback / valoracion"
                  description="Pedir una valoracion de 1-5 estrellas despues de cerrar el ticket"
                  enabled={editingPanel.feedbackEnabled ?? false}
                  onChange={(v) => updateField('feedbackEnabled', v)}
                />
                {editingPanel.feedbackEnabled && (
                  <Input
                    label="Mensaje de feedback"
                    placeholder="Como calificarias el soporte que recibiste?"
                    value={editingPanel.feedbackMessage || ''}
                    onChange={(e) => updateField('feedbackMessage', e.target.value)}
                  />
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-discord-lighter/30">
                <Input
                  label="Cierre automatico por inactividad (horas)"
                  type="number"
                  placeholder="0"
                  value={String(editingPanel.autoCloseHours ?? 0)}
                  onChange={(e) => updateField('autoCloseHours', parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-discord-muted mt-1">
                  Cierra el ticket automaticamente si no hay actividad en X horas. Pon 0 para desactivar.
                </p>
              </div>
            </>
          )}

          {/* ─── Buttons ─── */}
          {panelSection === 'buttons' && (
            <>
              <Input
                label="Etiqueta del boton"
                placeholder="Crear ticket"
                value={editingPanel.buttonLabel || ''}
                onChange={(e) => updateField('buttonLabel', e.target.value)}
              />
              <EmojiInput
                label="Emoji del boton"
                value={editingPanel.buttonEmoji || ''}
                onChange={(v) => updateField('buttonEmoji', v)}
                description="Emoji que aparece junto al texto del botón"
              />
              <Select
                label="Color del boton"
                options={[
                  { value: 'Primary', label: 'Blurple (Primario)' },
                  { value: 'Secondary', label: 'Gris (Secundario)' },
                  { value: 'Success', label: 'Verde (Exito)' },
                  { value: 'Danger', label: 'Rojo (Peligro)' },
                ]}
                value={editingPanel.buttonColor || 'Primary'}
                onChange={(e) => updateField('buttonColor', e.target.value)}
              />

              {/* Live button preview */}
              <div className="p-3 rounded-lg bg-discord-darker border border-discord-lighter/20">
                <p className="text-xs text-discord-muted mb-2">Vista previa del botón:</p>
                <span
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium ${
                    editingPanel.buttonColor === 'Primary' ? 'bg-discord-blurple text-white' :
                    editingPanel.buttonColor === 'Success' ? 'bg-green-600 text-white' :
                    editingPanel.buttonColor === 'Danger' ? 'bg-red-600 text-white' :
                    'bg-discord-lighter text-discord-white'
                  }`}
                >
                  {editingPanel.buttonEmoji && <span>{editingPanel.buttonEmoji}</span>}
                  {editingPanel.buttonLabel || 'Crear ticket'}
                </span>
              </div>

              <div className="border-t border-discord-lighter pt-4 mt-4 space-y-3">
                <p className="text-sm font-medium text-discord-white mb-2">Botones mostrados en el canal del ticket</p>
                <Toggle
                  label="Boton cerrar"
                  enabled={editingPanel.showCloseButton ?? true}
                  onChange={(v) => updateField('showCloseButton', v)}
                />
                <Toggle
                  label="Boton asignar"
                  enabled={editingPanel.showClaimButton ?? true}
                  onChange={(v) => updateField('showClaimButton', v)}
                />
                <Toggle
                  label="Boton transcripcion"
                  enabled={editingPanel.showTranscriptButton ?? true}
                  onChange={(v) => updateField('showTranscriptButton', v)}
                />
              </div>

              <div className="border-t border-discord-lighter pt-4 mt-4 space-y-3">
                <Toggle
                  label="Activar asignacion"
                  description="Permitir al staff asignarse tickets individuales"
                  enabled={editingPanel.claimEnabled ?? true}
                  onChange={(v) => updateField('claimEnabled', v)}
                />
                {editingPanel.claimEnabled && (
                  <Toggle
                    label="Bloquear a otros al asignar"
                    description="Solo el staff que se asigna puede responder despues"
                    enabled={editingPanel.claimLockOthers ?? false}
                    onChange={(v) => updateField('claimLockOthers', v)}
                  />
                )}
              </div>
            </>
          )}

          {/* ─── Transcripts ─── */}
          {panelSection === 'transcripts' && (
            <>
              <Toggle
                label="Generar transcripcion automatica"
                description="Generar automaticamente una transcripcion HTML al cerrar un ticket"
                enabled={editingPanel.transcriptEnabled ?? true}
                onChange={(v) => updateField('transcriptEnabled', v)}
              />
              {editingPanel.transcriptEnabled && (
                <>
                  <ChannelSelect
                    label="Canal de transcripciones"
                    description="Canal donde se publican las transcripciones al cerrar tickets."
                    channels={guildChannels}
                    value={editingPanel.transcriptChannelId || ''}
                    onChange={(v) => updateField('transcriptChannelId', v || null)}
                  />
                  <Toggle
                    label="Enviar transcripcion por DM al usuario"
                    description="Enviar el archivo HTML al creador del ticket por DM"
                    enabled={editingPanel.transcriptDMUser ?? true}
                    onChange={(v) => updateField('transcriptDMUser', v)}
                  />
                  <Toggle
                    label="Enviar transcripcion por DM al staff"
                    description="Enviar la transcripcion al miembro de staff asignado"
                    enabled={editingPanel.transcriptDMStaff ?? false}
                    onChange={(v) => updateField('transcriptDMStaff', v)}
                  />
                </>
              )}

              <div className="border-t border-discord-lighter pt-4 mt-4">
                <ChannelSelect
                  label="Canal de registro (log)"
                  description="Los eventos de abrir/cerrar/eliminar ticket se registran aquí. Deja vacío para usar el predeterminado del servidor."
                  channels={guildChannels}
                  value={editingPanel.logChannelId || ''}
                  onChange={(v) => updateField('logChannelId', v || null)}
                />
              </div>
            </>
          )}

          {/* ─── Forms ─── */}
          {panelSection === 'forms' && (
            <>
              <Toggle
                label="Activar formulario al crear ticket"
                description="Mostrar un formulario modal cuando los usuarios crean un ticket"
                enabled={editingPanel.formEnabled ?? false}
                onChange={(v) => updateField('formEnabled', v)}
              />
              {editingPanel.formEnabled && (
                <>
                  <Input
                    label="Titulo del formulario"
                    placeholder="Formulario de ticket"
                    value={editingPanel.formTitle || ''}
                    onChange={(e) => updateField('formTitle', e.target.value)}
                  />

                  <div className="space-y-3 mt-3">
                    <p className="text-sm font-medium text-discord-white">Preguntas (max 5)</p>
                    {(editingPanel.formQuestions || []).map((q, i) => (
                      <div key={i} className="p-3 rounded-lg bg-discord-darker border border-discord-lighter/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-discord-muted font-medium">Pregunta {i + 1}</span>
                          <button
                            onClick={() => {
                              const qs = [...(editingPanel.formQuestions || [])];
                              qs.splice(i, 1);
                              updateField('formQuestions', qs);
                            }}
                            className="p-1 text-discord-muted hover:text-discord-red transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <Input
                          placeholder="Etiqueta de pregunta"
                          value={q.label}
                          onChange={(e) => {
                            const qs = [...(editingPanel.formQuestions || [])];
                            qs[i] = { ...qs[i], label: e.target.value };
                            updateField('formQuestions', qs);
                          }}
                        />
                        <Input
                          placeholder="Texto de ejemplo"
                          value={q.placeholder || ''}
                          onChange={(e) => {
                            const qs = [...(editingPanel.formQuestions || [])];
                            qs[i] = { ...qs[i], placeholder: e.target.value };
                            updateField('formQuestions', qs);
                          }}
                        />
                        <div className="flex gap-3">
                          <Select
                            options={[
                              { value: 'short', label: 'Corta (1 linea)' },
                              { value: 'paragraph', label: 'Parrafo (varias lineas)' },
                            ]}
                            value={q.style}
                            onChange={(e) => {
                              const qs = [...(editingPanel.formQuestions || [])];
                              qs[i] = { ...qs[i], style: e.target.value as 'short' | 'paragraph' };
                              updateField('formQuestions', qs);
                            }}
                          />
                          <Toggle
                            label="Obligatoria"
                            enabled={q.required}
                            onChange={(v) => {
                              const qs = [...(editingPanel.formQuestions || [])];
                              qs[i] = { ...qs[i], required: v };
                              updateField('formQuestions', qs);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    {(editingPanel.formQuestions || []).length < 5 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          const qs = [...(editingPanel.formQuestions || [])];
                          qs.push({ label: '', placeholder: '', style: 'short', required: true });
                          updateField('formQuestions', qs);
                        }}
                      >
                        <Plus size={14} /> Agregar pregunta
                      </Button>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* ─── Advanced ─── */}
          {/* ─── Sticky Panel ─── */}
          {panelSection === 'sticky' && (
            <>
              <div className="p-3 rounded-lg bg-discord-blurple/10 border border-discord-blurple/30 mb-2">
                <p className="text-sm font-medium text-discord-blurple mb-1">¿Qué es el Panel Fijo?</p>
                <p className="text-xs text-discord-muted">Cuando alguien envía un mensaje en el canal del panel, el bot elimina el panel antiguo y lo vuelve a publicar al final del canal, manteniéndolo siempre visible.</p>
              </div>

              <Toggle
                label="Activar panel fijo (sticky)"
                description="El panel se re-publicará automáticamente al final del canal cuando lleguen nuevos mensajes."
                enabled={editingPanel.panelAutoRepost ?? false}
                onChange={(v) => updateField('panelAutoRepost', v)}
              />

              {editingPanel.panelAutoRepost && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Input
                        label="Cooldown entre re-publicaciones (segundos)"
                        type="number"
                        min={1}
                        max={300}
                        placeholder="5"
                        value={String(editingPanel.panelAutoRepostCooldown ?? 5)}
                        onChange={(e) => updateField('panelAutoRepostCooldown', Math.max(1, parseInt(e.target.value) || 5))}
                      />
                      <p className="text-xs text-discord-muted mt-1">Mínimo 1 segundo. Recomendado: 5–30 segundos para canales activos.</p>
                    </div>
                    <div className="flex flex-col justify-center">
                      <Toggle
                        label="Ignorar mensajes de bots"
                        description="No re-publicar cuando un bot envía un mensaje (evita bucles)."
                        enabled={editingPanel.panelAutoRepostIgnoreBots ?? true}
                        onChange={(v) => updateField('panelAutoRepostIgnoreBots', v)}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-xs text-yellow-400">
                      <strong>Recomendación:</strong> Activa "Ignorar mensajes de bots" para evitar que el propio panel dispare una re-publicación infinita. El cooldown evita spam si el canal es muy activo.
                    </p>
                  </div>
                </>
              )}

              {!editingPanel.panelAutoRepost && (
                <div className="text-center py-6 text-discord-muted">
                  <p className="text-sm">Activa el panel fijo para ver las opciones de configuración.</p>
                </div>
              )}
            </>
          )}

          {panelSection === 'advanced' && (
            <>
              <Input
                label="Escalar a ID de panel"
                placeholder="ID de panel al que escalar tickets (opcional)"
                value={editingPanel.escalatePanelId || ''}
                onChange={(e) => updateField('escalatePanelId', e.target.value)}
              />
              <p className="text-xs text-discord-muted">
                Cuando el staff use /ticket escalate, el ticket se movera a la categoria y roles de staff de este panel.
              </p>
              {panels.length > 0 && (
                <div className="mt-1">
                  <p className="text-xs text-discord-muted">Paneles disponibles:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {panels.filter(p => p.id !== editingPanelId).map(p => (
                      <button
                        key={p.id}
                        onClick={() => updateField('escalatePanelId', p.id)}
                        className="text-xs px-2 py-0.5 rounded bg-discord-lighter text-discord-muted hover:text-discord-white transition-colors"
                      >
                        {p.name} ({p.id.slice(0, 8)}...)
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Save / Cancel */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-discord-lighter">
          <Button variant="secondary" onClick={() => setShowPanelModal(false)}>Cancelar</Button>
          {editingPanelId && (editingPanel as any).messageId && (editingPanel as any).channelId !== '0' && (
            <Button
              onClick={() => syncPanel(editingPanelId)}
              loading={syncingPanel}
              variant="secondary"
            >
              Sincronizar Discord
            </Button>
          )}
          <Button onClick={savePanel} loading={savingPanel}>
            {editingPanelId ? 'Guardar cambios' : 'Crear panel'}
          </Button>
        </div>
      </Modal>

      {/* ═══════ QUICK EMOJI MODAL ═══════ */}
      <Modal
        open={!!quickEmojiPanel}
        onClose={() => setQuickEmojiPanel(null)}
        title={`Editar emoji — ${quickEmojiPanel?.name || ''}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <EmojiInput
            label="Emoji del botón"
            value={quickEmoji}
            onChange={setQuickEmoji}
            description="Elige un emoji rápido o escribe uno personalizado"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setQuickEmojiPanel(null)}>Cancelar</Button>
            <Button onClick={saveQuickEmoji} loading={savingQuickEmoji}>Guardar emoji</Button>
          </div>
        </div>
      </Modal>

      {/* ═══════ TRANSCRIPT VIEWER MODAL ═══════ */}
      <Modal
        open={!!viewingTranscript}
        onClose={() => setViewingTranscript(null)}
        title={`Transcripcion - Ticket #${viewingTranscript?.ticket?.number ?? '?'}`}
        maxWidth="max-w-4xl"
      >
        {loadingTranscript ? (
          <Loader text="Cargando transcripcion..." />
        ) : viewingTranscript ? (
          <div>
            {/* Meta */}
            <div className="flex flex-wrap gap-4 mb-4 text-xs text-discord-muted">
              <span>Creador: {viewingTranscript.userId}</span>
              <span>Cerrado por: {viewingTranscript.closedBy || 'N/D'}</span>
              <span>Mensajes: {viewingTranscript.messageCount}</span>
              <span>Fecha: {new Date(viewingTranscript.createdAt).toLocaleString()}</span>
            </div>

            {/* Download button */}
            {guildId && (
              <div className="mb-4">
                <Button size="sm" variant="secondary" onClick={() => downloadTranscriptHtml(viewingTranscript.id)}>
                  <Download size={14} /> Descargar HTML
                </Button>
              </div>
            )}

            {/* Message list */}
            <div className="max-h-[50vh] overflow-y-auto space-y-2">
              {(Array.isArray(viewingTranscript.messages) ? viewingTranscript.messages : []).map((msg: any, i: number) => (
                <div key={i} className="flex gap-3 p-2 rounded hover:bg-discord-darker">
                  <div className="w-8 h-8 rounded-full bg-discord-lighter flex items-center justify-center text-xs text-discord-muted flex-shrink-0">
                    {(msg.author?.username || msg.authorTag || '?')[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-discord-white">
                        {msg.author?.username || msg.authorTag || 'Desconocido'}
                      </span>
                      <span className="text-xs text-discord-muted">
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="text-sm text-discord-white/80 whitespace-pre-wrap break-words">{msg.content || ''}</p>
                    {msg.attachments?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {msg.attachments.map((a: any, j: number) => (
                          <span key={j} className="text-xs text-discord-blurple underline">{a.name || a.url || 'adjunto'}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!viewingTranscript.messages || (Array.isArray(viewingTranscript.messages) && viewingTranscript.messages.length === 0)) && (
                <p className="text-center text-discord-muted py-4">No hay mensajes en esta transcripcion.</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
