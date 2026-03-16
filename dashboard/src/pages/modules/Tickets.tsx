import { useEffect, useState, useCallback } from 'react';
import { useGuild } from '@/hooks/useGuild';
import { tickets as ticketsApi } from '@/lib/api';
import Card from '@/components/Card';
import Table from '@/components/Table';
import Button from '@/components/Button';
import Input, { Textarea, Select } from '@/components/Input';
import Modal from '@/components/Modal';
import Toggle from '@/components/Toggle';
import Loader from '@/components/Loader';
import StatCard from '@/components/StatCard';
import toast from 'react-hot-toast';
import {
  Ticket, FolderOpen, FolderClosed, Plus, Trash2, FileText,
  Settings, Star, TrendingUp, Edit3, Eye, Download, ChevronLeft, ChevronRight,
  AlertTriangle, Search, X,
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
  const [panelSection, setPanelSection] = useState<'general' | 'categories' | 'permissions' | 'messages' | 'buttons' | 'transcripts' | 'forms' | 'advanced'>('general');
  const [savingPanel, setSavingPanel] = useState(false);

  // Transcript viewer
  const [viewingTranscript, setViewingTranscript] = useState<any>(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

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
  }, [tab, fetchTickets, fetchTranscripts]);

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
      if (editingPanelId) {
        const updated = await ticketsApi.updatePanel(guildId, editingPanelId, editingPanel);
        setPanels((prev) => prev.map((p) => (p.id === editingPanelId ? updated : p)));
          toast.success('Panel actualizado');
      } else {
        if (!editingPanel.channelId) {
          toast.error('El ID del canal es obligatorio');
          setSavingPanel(false);
          return;
        }
        const created = await ticketsApi.createPanel(guildId, editingPanel);
        setPanels((prev) => [...prev, created]);
        toast.success('Panel creado');
      }
      setShowPanelModal(false);
      fetchOverview();
    } catch {
      toast.error('No se pudo guardar el panel');
    } finally {
      setSavingPanel(false);
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
    // Open in new tab with auth
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
                    <div>
                      <p className="text-sm font-medium text-discord-white">{panel.name}</p>
                       <p className="text-xs text-discord-muted">{panel.title} &middot; {panel._count?.tickets ?? 0} tickets &middot; {panel._count?.transcripts ?? 0} transcripciones</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => { setTab('panels'); openEditPanel(panel); }}>
                      <Edit3 size={14} />
                    </Button>
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
              <Input
                label="ID del canal"
                placeholder="Canal para enviar el embed del panel"
                value={editingPanel.channelId || ''}
                onChange={(e) => updateField('channelId', e.target.value)}
              />
              <Input
                label="Titulo del embed"
                placeholder="Tickets de soporte"
                value={editingPanel.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
              />
              <Textarea
                label="Descripcion del embed"
                placeholder="Haz clic en el boton de abajo para crear un ticket."
                value={editingPanel.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Color del embed (hex)"
                  type="color"
                  value={editingPanel.embedColor || '#5865F2'}
                  onChange={(e) => updateField('embedColor', e.target.value)}
                />
                <Input
                  label="Texto del pie"
                  placeholder="Pie opcional"
                  value={editingPanel.footerText || ''}
                  onChange={(e) => updateField('footerText', e.target.value)}
                />
              </div>
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
                <Input
                  label="Patron de nombre"
                  placeholder="ticket-{number}"
                  value={editingPanel.namingPattern || ''}
                  onChange={(e) => updateField('namingPattern', e.target.value)}
                />
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
              <Input
                label="ID de categoria de tickets abiertos"
                placeholder="Categoria para tickets nuevos"
                value={editingPanel.categoryId || ''}
                onChange={(e) => updateField('categoryId', e.target.value)}
              />
              <Input
                label="ID de categoria de tickets cerrados"
                placeholder="Categoria para mover tickets cerrados (opcional)"
                value={editingPanel.closedCategoryId || ''}
                onChange={(e) => updateField('closedCategoryId', e.target.value)}
              />
              <p className="text-xs text-discord-muted">
                Cuando se cierra un ticket, se puede mover a una categoria separada. Dejalo vacio para mantenerlo en la misma categoria.
              </p>
            </>
          )}

          {/* ─── Permissions ─── */}
          {panelSection === 'permissions' && (
            <>
              <Input
                label="IDs de roles del staff (separados por coma)"
                placeholder="ej. 123456789,987654321"
                value={(editingPanel.staffRoleIds || []).join(',')}
                onChange={(e) => updateField('staffRoleIds', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              />
              <p className="text-xs text-discord-muted mb-3">El staff puede ver y responder en tickets.</p>
              <Input
                label="IDs de roles admin (separados por coma)"
                placeholder="ej. 123456789"
                value={(editingPanel.adminRoleIds || []).join(',')}
                onChange={(e) => updateField('adminRoleIds', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              />
              <p className="text-xs text-discord-muted">Los admins pueden eliminar tickets y administrar ajustes del panel.</p>

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
              <Textarea
                label="Mensaje de bienvenida"
                placeholder="Bienvenido! Describe tu problema."
                value={editingPanel.welcomeMessage || ''}
                onChange={(e) => updateField('welcomeMessage', e.target.value)}
              />
              <Input
                label="Color del embed de bienvenida"
                type="color"
                value={editingPanel.welcomeColor || '#5865F2'}
                onChange={(e) => updateField('welcomeColor', e.target.value)}
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
              <Input
                label="Emoji del boton"
                placeholder="🎫"
                value={editingPanel.buttonEmoji || ''}
                onChange={(e) => updateField('buttonEmoji', e.target.value)}
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
                  <Input
                    label="ID del canal de transcripciones"
                    placeholder="Canal para publicar enlaces de transcripciones"
                    value={editingPanel.transcriptChannelId || ''}
                    onChange={(e) => updateField('transcriptChannelId', e.target.value)}
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
                <Input
                  label="ID del canal de registro"
                  placeholder="Sobrescribir canal de registro de tickets del servidor"
                  value={editingPanel.logChannelId || ''}
                  onChange={(e) => updateField('logChannelId', e.target.value)}
                />
                <p className="text-xs text-discord-muted mt-1">Los eventos de abrir/cerrar/eliminar ticket se registran aqui. Deja vacio para usar el predeterminado del servidor.</p>
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
          <Button onClick={savePanel} loading={savingPanel}>
            {editingPanelId ? 'Guardar cambios' : 'Crear panel'}
          </Button>
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
