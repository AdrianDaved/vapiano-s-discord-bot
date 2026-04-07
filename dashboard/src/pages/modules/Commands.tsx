import { useState, useEffect, useCallback } from 'react';
import { useGuild } from '@/hooks/useGuild';
import { commandsApi, guilds as guildsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import { Shield, ChevronDown, ChevronUp, Search, ChevronRight } from 'lucide-react';

interface CommandConfig {
  name: string;
  parent?: string;
  subcommand?: string;
  module: string;
  description: string;
  disabled: boolean;
  roleIds: string[];
}

interface Role {
  id: string;
  name: string;
  color: number;
  position: number;
}

const MODULE_LABELS: Record<string, string> = {
  moderation:  '🛡️ Moderación',
  utility:     '🔧 Utilidades',
  social:      '👥 Social',
  automation:  '⚡ Automatización',
  config:      '⚙️ Configuración',
  invites:     '📨 Invitaciones',
  tickets:     '🎫 Tickets',
  reputation:  '⭐ Reputación',
  backup:      '💾 Respaldos',
};

const MODULE_ORDER = ['moderation','utility','social','automation','tickets','reputation','invites','config','backup'];

export default function Commands() {
  const { guildId } = useGuild();

  const [commands, setCommands] = useState<CommandConfig[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const [cmds, guildRoles] = await Promise.all([
        commandsApi.list(guildId),
        guildsApi.roles(guildId).catch(() => []),
      ]);
      setCommands(cmds);
      setRoles((guildRoles as Role[]).filter(r => r.name !== '@everyone').sort((a, b) => b.position - a.position));
    } catch {
      toast.error('No se pudieron cargar los comandos');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateCommand = async (name: string, patch: { disabled?: boolean; roleIds?: string[] }) => {
    if (!guildId) return;
    setSaving(name);
    try {
      const updated = await commandsApi.update(guildId, name, patch);
      setCommands(prev => prev.map(c => c.name === name ? { ...c, ...updated } : c));
      toast.success('Guardado');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(null);
    }
  };

  const toggleDisabled = (cmd: CommandConfig) => updateCommand(cmd.name, { disabled: !cmd.disabled });

  const toggleRole = (cmd: CommandConfig, roleId: string) => {
    const current = cmd.roleIds ?? [];
    const next = current.includes(roleId) ? current.filter(id => id !== roleId) : [...current, roleId];
    updateCommand(cmd.name, { roleIds: next });
  };

  const filtered = commands.filter(c =>
    !search ||
    c.name.includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  // Group by module, then by parent inside each module
  const grouped = MODULE_ORDER.reduce((acc, mod) => {
    const cmds = filtered.filter(c => c.module === mod);
    if (cmds.length) acc[mod] = cmds;
    return acc;
  }, {} as Record<string, CommandConfig[]>);

  useEffect(() => {
    if (search) {
      setExpanded(Object.fromEntries(Object.keys(grouped).map(m => [m, true])));
      const parents = new Set(filtered.filter(c => c.parent).map(c => c.parent!));
      setExpandedParents(Object.fromEntries([...parents].map(p => [p, true])));
    }
  }, [search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
      </div>
    );
  }

  const disabledCount = commands.filter(c => c.disabled).length;
  const restrictedCount = commands.filter(c => (c.roleIds?.length ?? 0) > 0).length;

  const CommandRow = ({ cmd, indent = false }: { cmd: CommandConfig; indent?: boolean }) => (
    <div className={`px-5 py-3.5 ${cmd.disabled ? 'opacity-60' : ''} ${indent ? 'pl-10 bg-gray-800/20' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {indent && <ChevronRight className="w-3 h-3 text-gray-600 shrink-0" />}
            <code className="text-indigo-400 font-mono text-sm">
              {cmd.subcommand
                ? <><span className="text-gray-500">/{cmd.parent}</span> {cmd.subcommand}</>
                : <>/{cmd.name}</>
              }
            </code>
            {cmd.disabled && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Desactivado</span>}
            {(cmd.roleIds?.length ?? 0) > 0 && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                {cmd.roleIds.length} rol{cmd.roleIds.length !== 1 ? 'es' : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{cmd.description}</p>
        </div>
        <button
          onClick={() => toggleDisabled(cmd)}
          disabled={saving === cmd.name}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            cmd.disabled
              ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
              : 'border-green-500/40 text-green-400 hover:bg-green-500/10'
          }`}
        >
          {saving === cmd.name ? '...' : cmd.disabled ? 'Activar' : 'Desactivar'}
        </button>
      </div>

      {!cmd.disabled && roles.length > 0 && (
        <div className="mt-2.5">
          <p className="text-xs text-gray-500 mb-1.5">
            Roles permitidos <span className="text-gray-600">(sin selección = solo administradores)</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {roles.map(role => {
              const selected = cmd.roleIds?.includes(role.id) ?? false;
              const hex = role.color ? '#' + role.color.toString(16).padStart(6, '0') : '#6b7280';
              return (
                <button
                  key={role.id}
                  onClick={() => toggleRole(cmd, role.id)}
                  disabled={saving === cmd.name}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                    selected ? 'text-white' : 'border-gray-600 text-gray-400 hover:border-gray-500'
                  }`}
                  style={selected ? { backgroundColor: hex + '30', borderColor: hex, color: hex } : {}}
                >
                  @{role.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-500/10 rounded-lg">
          <Shield className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Permisos de Comandos</h1>
          <p className="text-sm text-gray-400">Activa, desactiva o restringe cada comando por rol</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total comandos', value: commands.length, color: 'text-indigo-400' },
          { label: 'Desactivados', value: disabledCount, color: 'text-red-400' },
          { label: 'Con restricción', value: restrictedCount, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full bg-gray-800/50 border border-gray-700/50 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 text-sm"
          placeholder="Buscar comando o subcomando..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Modules */}
      {Object.entries(grouped).map(([module, cmds]) => {
        // Separate standalone commands and subcommands
        const standalone = cmds.filter(c => !c.parent);
        const subCmds = cmds.filter(c => c.parent);
        const parentNames = [...new Set(subCmds.map(c => c.parent!))];

        const total = standalone.length + subCmds.length;
        const disabledInModule = cmds.filter(c => c.disabled).length;

        return (
          <div key={module} className="bg-gray-800/30 border border-gray-700/50 rounded-xl overflow-hidden">
            {/* Module header */}
            <button
              onClick={() => setExpanded(prev => ({ ...prev, [module]: !prev[module] }))}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-700/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white">{MODULE_LABELS[module] ?? module}</span>
                <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">{total}</span>
                {disabledInModule > 0 && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                    {disabledInModule} desactivado{disabledInModule !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {expanded[module] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {expanded[module] && (
              <div className="border-t border-gray-700/50">
                {/* Standalone commands */}
                {standalone.map((cmd, i) => (
                  <div key={cmd.name} className={i > 0 || parentNames.length > 0 ? 'border-t border-gray-700/20' : ''}>
                    <CommandRow cmd={cmd} indent={false} />
                  </div>
                ))}

                {/* Parent command groups */}
                {parentNames.map((parentName, pi) => {
                  const children = subCmds.filter(c => c.parent === parentName);
                  const isOpen = expandedParents[parentName] ?? false;
                  const disabledChildren = children.filter(c => c.disabled).length;
                  const restrictedChildren = children.filter(c => (c.roleIds?.length ?? 0) > 0).length;

                  return (
                    <div key={parentName} className={`border-t border-gray-700/30 ${pi === 0 && standalone.length > 0 ? 'border-t-gray-700/50' : ''}`}>
                      {/* Parent label */}
                      <button
                        onClick={() => setExpandedParents(prev => ({ ...prev, [parentName]: !prev[parentName] }))}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-700/20 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-purple-400 font-mono text-sm">/{parentName}</code>
                          <span className="text-xs bg-gray-700/60 text-gray-400 px-2 py-0.5 rounded-full">{children.length} subcomandos</span>
                          {disabledChildren > 0 && (
                            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{disabledChildren} desactivado{disabledChildren !== 1 ? 's' : ''}</span>
                          )}
                          {restrictedChildren > 0 && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">{restrictedChildren} con roles</span>
                          )}
                        </div>
                        {isOpen
                          ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                          : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
                      </button>

                      {isOpen && (
                        <div className="border-t border-gray-700/20 divide-y divide-gray-700/20">
                          {children.map(cmd => (
                            <CommandRow key={cmd.name} cmd={cmd} indent={true} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-12 text-gray-500">No se encontraron comandos.</div>
      )}
    </div>
  );
}
