import { useEffect, useState, useMemo } from 'react';
import { useGuild } from '@/hooks/useGuild';
import { moderation as modApi } from '@/lib/api';
import Card from '@/components/Card';
import Table from '@/components/Table';
import Loader from '@/components/Loader';
import StatCard from '@/components/StatCard';
import Button from '@/components/Button';
import ConfirmDialog from '@/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { Shield, AlertTriangle, Gavel, Trash2, Search, X } from 'lucide-react';

interface ModAction {
  id: string;
  type: string;
  userId: string;
  userTag: string;
  moderatorTag: string;
  reason: string | null;
  createdAt: string;
}

interface Warning {
  id: string;
  userId: string;
  userTag: string;
  moderatorTag: string;
  reason: string;
  createdAt: string;
}

const ACTION_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  warn:     { label: 'ADVERTENCIA', bg: 'bg-yellow-500/15', text: 'text-yellow-400' },
  mute:     { label: 'SILENCIO',    bg: 'bg-purple-500/15', text: 'text-purple-400' },
  tempmute: { label: 'SILENCIO TEMP', bg: 'bg-purple-500/15', text: 'text-purple-400' },
  kick:     { label: 'EXPULSIÓN',   bg: 'bg-orange-500/15', text: 'text-orange-400' },
  ban:      { label: 'BANEO',       bg: 'bg-discord-red/15', text: 'text-discord-red' },
  tempban:  { label: 'BANEO TEMP',  bg: 'bg-discord-red/15', text: 'text-discord-red' },
  unmute:   { label: 'DESSILENCIO', bg: 'bg-discord-green/15', text: 'text-discord-green' },
  unban:    { label: 'DESBANEO',    bg: 'bg-discord-green/15', text: 'text-discord-green' },
};

export default function Moderation() {
  const { guildId, loading: configLoading } = useGuild();
  const [actions, setActions] = useState<ModAction[]>([]);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'actions' | 'warnings'>('actions');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Search/filter state
  const [searchActions, setSearchActions] = useState('');
  const [filterType, setFilterType] = useState('');
  const [searchWarnings, setSearchWarnings] = useState('');

  useEffect(() => {
    if (!guildId) return;
    Promise.all([
      modApi.actions(guildId).catch(() => []),
      modApi.warnings(guildId).catch(() => []),
    ])
      .then(([acts, warns]) => {
        setActions(acts);
        setWarnings(warns);
      })
      .finally(() => setLoading(false));
  }, [guildId]);

  const filteredActions = useMemo(() => {
    return actions.filter(a => {
      const matchType = !filterType || a.type === filterType;
      const q = searchActions.toLowerCase();
      const matchSearch = !q || a.userTag.toLowerCase().includes(q) || a.moderatorTag.toLowerCase().includes(q) || (a.reason || '').toLowerCase().includes(q);
      return matchType && matchSearch;
    });
  }, [actions, filterType, searchActions]);

  const filteredWarnings = useMemo(() => {
    const q = searchWarnings.toLowerCase();
    return warnings.filter(w => {
      return !q || w.userTag.toLowerCase().includes(q) || w.moderatorTag.toLowerCase().includes(q) || w.reason.toLowerCase().includes(q);
    });
  }, [warnings, searchWarnings]);

  const deleteWarning = async (id: string) => {
    if (!guildId) return;
    setDeleting(true);
    try {
      await modApi.deleteWarning(guildId, id);
      setWarnings((prev) => prev.filter((w) => w.id !== id));
      toast.success('Advertencia eliminada');
    } catch {
      toast.error('No se pudo eliminar la advertencia');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (configLoading || loading) return <Loader text="Cargando moderación..." />;

  const uniqueTypes = [...new Set(actions.map(a => a.type))];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Moderación</h1>
        <p className="text-discord-muted mt-1">Ver acciones de moderación y advertencias</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Acciones totales" value={actions.length} icon={Gavel} color="text-discord-blurple" />
        <StatCard label="Advertencias activas" value={warnings.length} icon={AlertTriangle} color="text-yellow-400" />
        <StatCard
          label="Baneos"
          value={actions.filter((a) => a.type === 'ban' || a.type === 'tempban').length}
          icon={Shield}
          color="text-discord-red"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={tab === 'actions' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTab('actions')}
        >
          Acciones de mod ({actions.length})
        </Button>
        <Button
          variant={tab === 'warnings' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTab('warnings')}
        >
          Advertencias ({warnings.length})
        </Button>
      </div>

      {tab === 'actions' && (
        <Card>
          {/* Search & filter bar */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1 min-w-[180px] bg-discord-darker border border-discord-lighter/30 rounded-md px-3 py-2">
              <Search size={14} className="text-discord-muted flex-shrink-0" />
              <input
                value={searchActions}
                onChange={(e) => setSearchActions(e.target.value)}
                placeholder="Buscar usuario, moderador o razón..."
                className="flex-1 bg-transparent text-sm text-discord-white focus:outline-none placeholder:text-discord-muted/50"
              />
              {searchActions && (
                <button onClick={() => setSearchActions('')} className="text-discord-muted hover:text-discord-white transition-colors">
                  <X size={12} />
                </button>
              )}
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-discord-darker border border-discord-lighter/30 rounded-md px-3 py-2 text-sm text-discord-white focus:outline-none focus:border-discord-blurple"
            >
              <option value="">Todos los tipos</option>
              {uniqueTypes.map(t => (
                <option key={t} value={t}>{ACTION_TYPE_CONFIG[t]?.label || t.toUpperCase()}</option>
              ))}
            </select>
            {(searchActions || filterType) && (
              <button
                onClick={() => { setSearchActions(''); setFilterType(''); }}
                className="px-3 py-2 rounded-md text-sm text-discord-muted hover:text-discord-white border border-discord-lighter/30 hover:bg-discord-darker transition-colors"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {filteredActions.length !== actions.length && (
            <p className="text-xs text-discord-muted mb-3">Mostrando {filteredActions.length} de {actions.length} acciones</p>
          )}

          <Table
            columns={[
              {
                key: 'type',
                label: 'Acción',
                render: (a: ModAction) => {
                  const cfg = ACTION_TYPE_CONFIG[a.type];
                  return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cfg ? `${cfg.bg} ${cfg.text}` : 'bg-discord-lighter text-discord-muted'}`}>
                      {cfg?.label || a.type.toUpperCase()}
                    </span>
                  );
                },
              },
              {
                key: 'userTag',
                label: 'Usuario',
                render: (a: ModAction) => (
                  <span className="text-discord-white font-mono text-xs">{a.userTag}</span>
                ),
              },
              {
                key: 'moderatorTag',
                label: 'Moderador',
                render: (a: ModAction) => (
                  <span className="text-discord-muted font-mono text-xs">{a.moderatorTag}</span>
                ),
              },
              {
                key: 'reason',
                label: 'Razón',
                render: (a: ModAction) => (
                  <span className="text-discord-muted text-xs">{a.reason || <em className="opacity-50">Sin razón</em>}</span>
                ),
              },
              {
                key: 'createdAt',
                label: 'Fecha',
                render: (a: ModAction) => (
                  <span className="text-discord-muted text-xs">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </span>
                ),
              },
            ]}
            data={filteredActions}
            emptyMessage="No hay acciones de moderación que coincidan con tu búsqueda."
          />
        </Card>
      )}

      {tab === 'warnings' && (
        <Card>
          {/* Search bar */}
          <div className="flex items-center gap-2 mb-4 bg-discord-darker border border-discord-lighter/30 rounded-md px-3 py-2">
            <Search size={14} className="text-discord-muted flex-shrink-0" />
            <input
              value={searchWarnings}
              onChange={(e) => setSearchWarnings(e.target.value)}
              placeholder="Buscar usuario, moderador o razón..."
              className="flex-1 bg-transparent text-sm text-discord-white focus:outline-none placeholder:text-discord-muted/50"
            />
            {searchWarnings && (
              <button onClick={() => setSearchWarnings('')} className="text-discord-muted hover:text-discord-white transition-colors">
                <X size={12} />
              </button>
            )}
          </div>

          {filteredWarnings.length !== warnings.length && (
            <p className="text-xs text-discord-muted mb-3">Mostrando {filteredWarnings.length} de {warnings.length} advertencias</p>
          )}

          <Table
            columns={[
              {
                key: 'userTag',
                label: 'Usuario',
                render: (w: Warning) => (
                  <span className="text-discord-white font-mono text-xs">{w.userTag}</span>
                ),
              },
              {
                key: 'moderatorTag',
                label: 'Emitida por',
                render: (w: Warning) => (
                  <span className="text-discord-muted font-mono text-xs">{w.moderatorTag}</span>
                ),
              },
              {
                key: 'reason',
                label: 'Razón',
                render: (w: Warning) => (
                  <span className="text-discord-muted text-xs">{w.reason}</span>
                ),
              },
              {
                key: 'createdAt',
                label: 'Fecha',
                render: (w: Warning) => (
                  <span className="text-discord-muted text-xs">
                    {new Date(w.createdAt).toLocaleDateString()}
                  </span>
                ),
              },
              {
                key: 'actions',
                label: '',
                render: (w: Warning) => (
                  <button
                    onClick={() => setDeleteTarget(w.id)}
                    className="p-1 hover:text-discord-red text-discord-muted transition-colors"
                    title="Eliminar advertencia"
                  >
                    <Trash2 size={16} />
                  </button>
                ),
              },
            ]}
            data={filteredWarnings}
            emptyMessage="No hay advertencias que coincidan con tu búsqueda."
          />
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteWarning(deleteTarget)}
        title="Eliminar advertencia"
        message="¿Seguro que quieres eliminar esta advertencia? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        loading={deleting}
      />
    </div>
  );
}
