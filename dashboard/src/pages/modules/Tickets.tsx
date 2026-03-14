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
  name: 'Default',
  title: 'Support Tickets',
  description: 'Click the button below to create a ticket.',
  embedColor: '#5865F2',
  buttonLabel: 'Create Ticket',
  buttonEmoji: '🎫',
  buttonColor: 'Primary',
  style: 'button',
  namingPattern: 'ticket-{number}',
  staffRoleIds: [],
  adminRoleIds: [],
  ticketLimit: 1,
  mentionStaff: true,
  mentionCreator: true,
  welcomeTitle: 'Ticket Opened',
  welcomeMessage: 'Welcome! Please describe your issue.\nA staff member will assist you shortly.',
  welcomeColor: '#5865F2',
  closeRequestEnabled: true,
  closeRequestMessage: 'Are you sure you want to close this ticket?',
  claimEnabled: true,
  claimLockOthers: false,
  transcriptEnabled: true,
  transcriptDMUser: true,
  transcriptDMStaff: false,
  showCloseButton: true,
  showClaimButton: true,
  showTranscriptButton: true,
  formEnabled: false,
  formTitle: 'Ticket Form',
  formQuestions: [],
  feedbackEnabled: false,
  feedbackMessage: 'How would you rate the support you received?',
};

// ─── Priority helpers ────────────────────────────────────
const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-discord-muted',
  normal: 'text-discord-white',
  high: 'text-yellow-400',
  urgent: 'text-discord-red',
};

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
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
        toast.success('Panel updated');
      } else {
        if (!editingPanel.channelId) {
          toast.error('Channel ID is required');
          setSavingPanel(false);
          return;
        }
        const created = await ticketsApi.createPanel(guildId, editingPanel);
        setPanels((prev) => [...prev, created]);
        toast.success('Panel created');
      }
      setShowPanelModal(false);
      fetchOverview();
    } catch {
      toast.error('Failed to save panel');
    } finally {
      setSavingPanel(false);
    }
  };

  const deletePanel = async (id: string) => {
    if (!guildId) return;
    try {
      await ticketsApi.deletePanel(guildId, id);
      setPanels((prev) => prev.filter((p) => p.id !== id));
      toast.success('Panel deleted');
      fetchOverview();
    } catch {
      toast.error('Failed to delete panel');
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
      toast.error('Failed to load transcript');
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
  if (configLoading || loading) return <Loader text="Loading tickets..." />;

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-discord-white">Ticket System</h1>
        <p className="text-discord-muted mt-1">Manage ticket panels, view tickets, and browse transcripts</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-discord-darker rounded-lg p-1">
        {([
          { key: 'overview', label: 'Overview', icon: TrendingUp },
          { key: 'panels', label: 'Panels', icon: Settings },
          { key: 'tickets', label: 'Tickets', icon: Ticket },
          { key: 'transcripts', label: 'Transcripts', icon: FileText },
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
            <StatCard label="Open Tickets" value={ticketStats?.open ?? 0} icon={FolderOpen} color="text-discord-green" />
            <StatCard label="Closed Tickets" value={ticketStats?.closed ?? 0} icon={FolderClosed} color="text-discord-muted" />
            <StatCard label="This Week" value={ticketStats?.thisWeek ?? 0} icon={TrendingUp} color="text-discord-blurple" />
            <StatCard label="Avg Rating" value={ticketStats?.avgRating ? `${ticketStats.avgRating}/5` : 'N/A'} icon={Star} color="text-yellow-400" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <StatCard label="Total Tickets" value={ticketStats?.total ?? 0} icon={Ticket} color="text-discord-blurple" />
            <StatCard label="Panels" value={ticketStats?.panels ?? 0} icon={Settings} color="text-purple-400" />
            <StatCard label="Transcripts" value={ticketStats?.transcripts ?? 0} icon={FileText} color="text-cyan-400" />
          </div>

          {/* Quick panel list */}
          <Card title="Ticket Panels" description="Quick overview of configured panels">
            {panels.length === 0 ? (
              <div className="text-center py-8 text-discord-muted">
                <p>No ticket panels configured.</p>
                <Button size="sm" className="mt-3" onClick={() => { setTab('panels'); openNewPanel(); }}>
                  <Plus size={14} /> Create First Panel
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {panels.map((panel) => (
                  <div key={panel.id} className="flex items-center justify-between p-3 rounded-lg bg-discord-darker">
                    <div>
                      <p className="text-sm font-medium text-discord-white">{panel.name}</p>
                      <p className="text-xs text-discord-muted">{panel.title} &middot; {panel._count?.tickets ?? 0} tickets &middot; {panel._count?.transcripts ?? 0} transcripts</p>
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
          title="Ticket Panels"
          description="Configure panels that users interact with to create tickets"
          action={
            <Button size="sm" onClick={openNewPanel}>
              <Plus size={14} /> New Panel
            </Button>
          }
        >
          {panels.length === 0 ? (
            <div className="text-center py-8 text-discord-muted">
              <p>No panels yet. Create one to get started.</p>
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
                    <p className="text-xs text-discord-muted mt-1 truncate">{panel.title} &middot; Channel: {panel.channelId}</p>
                    <div className="flex gap-3 mt-1 text-xs text-discord-muted">
                      <span>{panel._count?.tickets ?? 0} tickets</span>
                      <span>{panel._count?.transcripts ?? 0} transcripts</span>
                      <span>Limit: {panel.ticketLimit}/user</span>
                      {panel.claimEnabled && <span>Claiming ON</span>}
                      {panel.formEnabled && <span>Form ON</span>}
                      {panel.feedbackEnabled && <span>Feedback ON</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-3">
                    <Button size="sm" variant="secondary" onClick={() => openEditPanel(panel)}>
                      <Edit3 size={14} /> Edit
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
        <Card title={`Tickets (${ticketTotal})`} description="Browse and filter all tickets">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="w-40">
              <Select
                label="Status"
                options={STATUS_OPTIONS}
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setTicketPage(1); }}
              />
            </div>
            <div className="w-40">
              <Select
                label="Priority"
                options={PRIORITY_OPTIONS}
                value={filterPriority}
                onChange={(e) => { setFilterPriority(e.target.value); setTicketPage(1); }}
              />
            </div>
            {panels.length > 0 && (
              <div className="w-48">
                <Select
                  label="Panel"
                  options={[{ value: '', label: 'All Panels' }, ...panels.map((p) => ({ value: p.id, label: p.name }))]}
                  value={filterPanel}
                  onChange={(e) => { setFilterPanel(e.target.value); setTicketPage(1); }}
                />
              </div>
            )}
            <div className="flex items-end">
              <Button size="sm" variant="secondary" onClick={() => fetchTickets(ticketPage)}>
                <Search size={14} /> Search
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
                label: 'Status',
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
                label: 'Priority',
                render: (t: TicketEntry) => (
                  <span className={`text-xs font-medium uppercase ${PRIORITY_COLORS[t.priority] || 'text-discord-white'}`}>
                    {t.priority === 'urgent' && <AlertTriangle size={12} className="inline mr-1" />}
                    {t.priority}
                  </span>
                ),
              },
              { key: 'userId', label: 'User', render: (t: TicketEntry) => <code className="text-xs text-discord-muted">{t.userId}</code> },
              {
                key: 'panel',
                label: 'Panel',
                render: (t: TicketEntry) => <span className="text-xs text-discord-muted">{t.panel?.name || '-'}</span>,
              },
              { key: 'claimedBy', label: 'Claimed', render: (t: TicketEntry) => <span className="text-xs text-discord-muted">{t.claimedBy || '-'}</span> },
              {
                key: 'rating',
                label: 'Rating',
                render: (t: TicketEntry) => t.rating ? (
                  <span className="text-yellow-400 text-xs">{'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}</span>
                ) : <span className="text-discord-muted text-xs">-</span>,
              },
              {
                key: 'createdAt',
                label: 'Created',
                render: (t: TicketEntry) => <span className="text-xs text-discord-muted">{new Date(t.createdAt).toLocaleDateString()}</span>,
              },
            ]}
            data={ticketList}
            emptyMessage="No tickets match your filters."
          />

          {/* Pagination */}
          {ticketPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-discord-lighter">
              <span className="text-xs text-discord-muted">Page {ticketPage} of {ticketPages} ({ticketTotal} total)</span>
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
        <Card title={`Transcripts (${transcriptTotal})`} description="Browse saved ticket transcripts">
          <Table
            columns={[
              {
                key: 'ticket',
                label: 'Ticket',
                render: (t: TranscriptEntry) => <span className="text-discord-blurple font-mono">#{t.ticket?.number ?? '?'}</span>,
              },
              { key: 'userId', label: 'Creator', render: (t: TranscriptEntry) => <code className="text-xs text-discord-muted">{t.userId}</code> },
              { key: 'closedBy', label: 'Closed By', render: (t: TranscriptEntry) => <code className="text-xs text-discord-muted">{t.closedBy || '-'}</code> },
              { key: 'messageCount', label: 'Messages', render: (t: TranscriptEntry) => <span className="text-sm">{t.messageCount}</span> },
              {
                key: 'createdAt',
                label: 'Date',
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
                      title="View messages"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => downloadTranscriptHtml(t.id)}
                      className="p-1.5 hover:bg-discord-lighter rounded text-discord-muted hover:text-discord-white transition-colors"
                      title="Download HTML"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                ),
              },
            ]}
            data={transcriptList}
            emptyMessage="No transcripts yet."
          />

          {/* Pagination */}
          {transcriptPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-discord-lighter">
              <span className="text-xs text-discord-muted">Page {transcriptPage} of {transcriptPages} ({transcriptTotal} total)</span>
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
        title={editingPanelId ? 'Edit Panel' : 'Create Panel'}
        maxWidth="max-w-3xl"
      >
        {/* Section tabs */}
        <div className="flex flex-wrap gap-1 mb-4 -mt-1">
          {([
            { key: 'general', label: 'General' },
            { key: 'categories', label: 'Categories' },
            { key: 'permissions', label: 'Permissions' },
            { key: 'messages', label: 'Messages' },
            { key: 'buttons', label: 'Buttons' },
            { key: 'transcripts', label: 'Transcripts' },
            { key: 'forms', label: 'Forms' },
            { key: 'advanced', label: 'Advanced' },
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
                label="Panel Name (internal)"
                placeholder="e.g. General Support"
                value={editingPanel.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
              />
              <Input
                label="Channel ID"
                placeholder="Channel to send the panel embed"
                value={editingPanel.channelId || ''}
                onChange={(e) => updateField('channelId', e.target.value)}
              />
              <Input
                label="Embed Title"
                placeholder="Support Tickets"
                value={editingPanel.title || ''}
                onChange={(e) => updateField('title', e.target.value)}
              />
              <Textarea
                label="Embed Description"
                placeholder="Click the button below to create a ticket."
                value={editingPanel.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Embed Color (hex)"
                  type="color"
                  value={editingPanel.embedColor || '#5865F2'}
                  onChange={(e) => updateField('embedColor', e.target.value)}
                />
                <Input
                  label="Footer Text"
                  placeholder="Optional footer"
                  value={editingPanel.footerText || ''}
                  onChange={(e) => updateField('footerText', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Style"
                  options={[
                    { value: 'button', label: 'Button' },
                    { value: 'dropdown', label: 'Dropdown Menu' },
                    { value: 'command', label: 'Command Only' },
                  ]}
                  value={editingPanel.style || 'button'}
                  onChange={(e) => updateField('style', e.target.value)}
                />
                <Input
                  label="Naming Pattern"
                  placeholder="ticket-{number}"
                  value={editingPanel.namingPattern || ''}
                  onChange={(e) => updateField('namingPattern', e.target.value)}
                />
              </div>
              <Input
                label="Max Open Tickets Per User"
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
                label="Open Tickets Category ID"
                placeholder="Category for new tickets"
                value={editingPanel.categoryId || ''}
                onChange={(e) => updateField('categoryId', e.target.value)}
              />
              <Input
                label="Closed Tickets Category ID"
                placeholder="Category to move closed tickets (optional)"
                value={editingPanel.closedCategoryId || ''}
                onChange={(e) => updateField('closedCategoryId', e.target.value)}
              />
              <p className="text-xs text-discord-muted">
                When a ticket is closed, it can be moved to a separate category. Leave empty to keep it in the same category.
              </p>
            </>
          )}

          {/* ─── Permissions ─── */}
          {panelSection === 'permissions' && (
            <>
              <Input
                label="Staff Role IDs (comma-separated)"
                placeholder="e.g. 123456789,987654321"
                value={(editingPanel.staffRoleIds || []).join(',')}
                onChange={(e) => updateField('staffRoleIds', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              />
              <p className="text-xs text-discord-muted mb-3">Staff can view and reply in tickets.</p>
              <Input
                label="Admin Role IDs (comma-separated)"
                placeholder="e.g. 123456789"
                value={(editingPanel.adminRoleIds || []).join(',')}
                onChange={(e) => updateField('adminRoleIds', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
              />
              <p className="text-xs text-discord-muted">Admins can delete tickets and manage panel settings.</p>

              <div className="border-t border-discord-lighter pt-4 mt-4 space-y-3">
                <Toggle
                  label="Mention Staff on Open"
                  description="Ping staff roles when a new ticket is created"
                  enabled={editingPanel.mentionStaff ?? true}
                  onChange={(v) => updateField('mentionStaff', v)}
                />
                <Toggle
                  label="Mention Creator"
                  description="Ping the ticket creator in the welcome message"
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
                label="Welcome Embed Title"
                placeholder="Ticket Opened"
                value={editingPanel.welcomeTitle || ''}
                onChange={(e) => updateField('welcomeTitle', e.target.value)}
              />
              <Textarea
                label="Welcome Message"
                placeholder="Welcome! Please describe your issue."
                value={editingPanel.welcomeMessage || ''}
                onChange={(e) => updateField('welcomeMessage', e.target.value)}
              />
              <Input
                label="Welcome Embed Color"
                type="color"
                value={editingPanel.welcomeColor || '#5865F2'}
                onChange={(e) => updateField('welcomeColor', e.target.value)}
              />

              <div className="border-t border-discord-lighter pt-4 mt-4 space-y-3">
                <Toggle
                  label="Close Request Confirmation"
                  description="Ask for confirmation before closing a ticket"
                  enabled={editingPanel.closeRequestEnabled ?? true}
                  onChange={(v) => updateField('closeRequestEnabled', v)}
                />
                {editingPanel.closeRequestEnabled && (
                  <Input
                    label="Close Request Message"
                    placeholder="Are you sure you want to close this ticket?"
                    value={editingPanel.closeRequestMessage || ''}
                    onChange={(e) => updateField('closeRequestMessage', e.target.value)}
                  />
                )}
              </div>

              <div className="border-t border-discord-lighter pt-4 mt-4 space-y-3">
                <Toggle
                  label="Feedback / Rating"
                  description="Ask for a 1-5 star rating after ticket is closed"
                  enabled={editingPanel.feedbackEnabled ?? false}
                  onChange={(v) => updateField('feedbackEnabled', v)}
                />
                {editingPanel.feedbackEnabled && (
                  <Input
                    label="Feedback Message"
                    placeholder="How would you rate the support you received?"
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
                label="Button Label"
                placeholder="Create Ticket"
                value={editingPanel.buttonLabel || ''}
                onChange={(e) => updateField('buttonLabel', e.target.value)}
              />
              <Input
                label="Button Emoji"
                placeholder="🎫"
                value={editingPanel.buttonEmoji || ''}
                onChange={(e) => updateField('buttonEmoji', e.target.value)}
              />
              <Select
                label="Button Color"
                options={[
                  { value: 'Primary', label: 'Blurple (Primary)' },
                  { value: 'Secondary', label: 'Gray (Secondary)' },
                  { value: 'Success', label: 'Green (Success)' },
                  { value: 'Danger', label: 'Red (Danger)' },
                ]}
                value={editingPanel.buttonColor || 'Primary'}
                onChange={(e) => updateField('buttonColor', e.target.value)}
              />

              <div className="border-t border-discord-lighter pt-4 mt-4 space-y-3">
                <p className="text-sm font-medium text-discord-white mb-2">Buttons Shown in Ticket Channel</p>
                <Toggle
                  label="Close Button"
                  enabled={editingPanel.showCloseButton ?? true}
                  onChange={(v) => updateField('showCloseButton', v)}
                />
                <Toggle
                  label="Claim Button"
                  enabled={editingPanel.showClaimButton ?? true}
                  onChange={(v) => updateField('showClaimButton', v)}
                />
                <Toggle
                  label="Transcript Button"
                  enabled={editingPanel.showTranscriptButton ?? true}
                  onChange={(v) => updateField('showTranscriptButton', v)}
                />
              </div>

              <div className="border-t border-discord-lighter pt-4 mt-4 space-y-3">
                <Toggle
                  label="Enable Claiming"
                  description="Allow staff to claim individual tickets"
                  enabled={editingPanel.claimEnabled ?? true}
                  onChange={(v) => updateField('claimEnabled', v)}
                />
                {editingPanel.claimEnabled && (
                  <Toggle
                    label="Lock Others on Claim"
                    description="Only the claiming staff member can reply after claiming"
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
                label="Auto-Generate Transcript"
                description="Automatically generate an HTML transcript when a ticket is closed"
                enabled={editingPanel.transcriptEnabled ?? true}
                onChange={(v) => updateField('transcriptEnabled', v)}
              />
              {editingPanel.transcriptEnabled && (
                <>
                  <Input
                    label="Transcript Channel ID"
                    placeholder="Channel to post transcript links"
                    value={editingPanel.transcriptChannelId || ''}
                    onChange={(e) => updateField('transcriptChannelId', e.target.value)}
                  />
                  <Toggle
                    label="DM Transcript to User"
                    description="Send the transcript HTML file to the ticket creator via DM"
                    enabled={editingPanel.transcriptDMUser ?? true}
                    onChange={(v) => updateField('transcriptDMUser', v)}
                  />
                  <Toggle
                    label="DM Transcript to Staff"
                    description="Send the transcript to the claiming staff member"
                    enabled={editingPanel.transcriptDMStaff ?? false}
                    onChange={(v) => updateField('transcriptDMStaff', v)}
                  />
                </>
              )}

              <div className="border-t border-discord-lighter pt-4 mt-4">
                <Input
                  label="Log Channel ID"
                  placeholder="Override guild-level ticket log channel"
                  value={editingPanel.logChannelId || ''}
                  onChange={(e) => updateField('logChannelId', e.target.value)}
                />
                <p className="text-xs text-discord-muted mt-1">Ticket open/close/delete events are logged here. Leave empty to use the guild default.</p>
              </div>
            </>
          )}

          {/* ─── Forms ─── */}
          {panelSection === 'forms' && (
            <>
              <Toggle
                label="Enable Form on Ticket Creation"
                description="Show a modal form when users create a ticket"
                enabled={editingPanel.formEnabled ?? false}
                onChange={(v) => updateField('formEnabled', v)}
              />
              {editingPanel.formEnabled && (
                <>
                  <Input
                    label="Form Title"
                    placeholder="Ticket Form"
                    value={editingPanel.formTitle || ''}
                    onChange={(e) => updateField('formTitle', e.target.value)}
                  />

                  <div className="space-y-3 mt-3">
                    <p className="text-sm font-medium text-discord-white">Questions (max 5)</p>
                    {(editingPanel.formQuestions || []).map((q, i) => (
                      <div key={i} className="p-3 rounded-lg bg-discord-darker border border-discord-lighter/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-discord-muted font-medium">Question {i + 1}</span>
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
                          placeholder="Question label"
                          value={q.label}
                          onChange={(e) => {
                            const qs = [...(editingPanel.formQuestions || [])];
                            qs[i] = { ...qs[i], label: e.target.value };
                            updateField('formQuestions', qs);
                          }}
                        />
                        <Input
                          placeholder="Placeholder text"
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
                              { value: 'short', label: 'Short (1 line)' },
                              { value: 'paragraph', label: 'Paragraph (multi-line)' },
                            ]}
                            value={q.style}
                            onChange={(e) => {
                              const qs = [...(editingPanel.formQuestions || [])];
                              qs[i] = { ...qs[i], style: e.target.value as 'short' | 'paragraph' };
                              updateField('formQuestions', qs);
                            }}
                          />
                          <Toggle
                            label="Required"
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
                        <Plus size={14} /> Add Question
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
                label="Escalate to Panel ID"
                placeholder="Panel ID to escalate tickets to (optional)"
                value={editingPanel.escalatePanelId || ''}
                onChange={(e) => updateField('escalatePanelId', e.target.value)}
              />
              <p className="text-xs text-discord-muted">
                When staff use /ticket escalate, the ticket will be moved to this panel's category and staff roles.
              </p>
              {panels.length > 0 && (
                <div className="mt-1">
                  <p className="text-xs text-discord-muted">Available panels:</p>
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
          <Button variant="secondary" onClick={() => setShowPanelModal(false)}>Cancel</Button>
          <Button onClick={savePanel} loading={savingPanel}>
            {editingPanelId ? 'Save Changes' : 'Create Panel'}
          </Button>
        </div>
      </Modal>

      {/* ═══════ TRANSCRIPT VIEWER MODAL ═══════ */}
      <Modal
        open={!!viewingTranscript}
        onClose={() => setViewingTranscript(null)}
        title={`Transcript — Ticket #${viewingTranscript?.ticket?.number ?? '?'}`}
        maxWidth="max-w-4xl"
      >
        {loadingTranscript ? (
          <Loader text="Loading transcript..." />
        ) : viewingTranscript ? (
          <div>
            {/* Meta */}
            <div className="flex flex-wrap gap-4 mb-4 text-xs text-discord-muted">
              <span>Creator: {viewingTranscript.userId}</span>
              <span>Closed by: {viewingTranscript.closedBy || 'N/A'}</span>
              <span>Messages: {viewingTranscript.messageCount}</span>
              <span>Date: {new Date(viewingTranscript.createdAt).toLocaleString()}</span>
            </div>

            {/* Download button */}
            {guildId && (
              <div className="mb-4">
                <Button size="sm" variant="secondary" onClick={() => downloadTranscriptHtml(viewingTranscript.id)}>
                  <Download size={14} /> Download HTML
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
                        {msg.author?.username || msg.authorTag || 'Unknown'}
                      </span>
                      <span className="text-xs text-discord-muted">
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="text-sm text-discord-white/80 whitespace-pre-wrap break-words">{msg.content || ''}</p>
                    {msg.attachments?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {msg.attachments.map((a: any, j: number) => (
                          <span key={j} className="text-xs text-discord-blurple underline">{a.name || a.url || 'attachment'}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {(!viewingTranscript.messages || (Array.isArray(viewingTranscript.messages) && viewingTranscript.messages.length === 0)) && (
                <p className="text-center text-discord-muted py-4">No messages in this transcript.</p>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
