import { NavLink, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Settings,
  UserPlus,
  Shield,
  ShieldAlert,
  Ticket,
  Bot,
  Database,
  LogOut,
  Star,
  Gift,
  Lightbulb,
  HandMetal,
  StickyNote,
  ScrollText,
  Sparkles,
  Tags,
  Send,
  ArrowLeftRight,
  X,
  Medal,
} from 'lucide-react';
import { useAuth, getAvatarUrl } from '@/hooks/useAuth';

interface StoredGuild {
  id: string;
  name: string;
  icon: string | null;
}

function getGuildIconUrl(guild: StoredGuild, size = 48): string | null {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=${size}`;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const modules = [
  { path: '', icon: LayoutDashboard, label: 'Panel' },
  { path: '/config', icon: Settings, label: 'Configuración general' },
  { path: '/welcome', icon: HandMetal, label: 'Bienvenida / Despedida' },
  { path: '/invites', icon: UserPlus, label: 'Invitaciones' },
  { path: '/moderation', icon: Shield, label: 'Moderación' },
  { path: '/automod', icon: ShieldAlert, label: 'AutoMod' },
  { path: '/tickets', icon: Ticket, label: 'Tickets' },
  { path: '/automation', icon: Bot, label: 'Automatización' },
  { path: '/reactionroles', icon: Tags, label: 'Roles por reacción' },
  { path: '/starboard', icon: Sparkles, label: 'Starboard' },
  { path: '/reputation', icon: Star, label: 'Reputación' },
  { path: '/giveaways', icon: Gift, label: 'Sorteos' },
  { path: '/suggestions', icon: Lightbulb, label: 'Sugerencias' },
  { path: '/sticky', icon: StickyNote, label: 'Mensajes fijos' },
  { path: '/messages', icon: Send, label: 'Enviar mensaje' },
  { path: '/logging', icon: ScrollText, label: 'Registros' },
  { path: '/backups', icon: Database, label: 'Copias de seguridad' },
  { path: '/migration', icon: ArrowLeftRight, label: 'Migración' },
  { path: '/commands', icon: Shield, label: 'Comandos' },
  { path: '/dar-rango', icon: Medal, label: 'Dar Rango' },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { guildId } = useParams();
  const { user, logout } = useAuth();
  const [currentGuild, setCurrentGuild] = useState<StoredGuild | null>(null);

  useEffect(() => {
    if (!guildId) { setCurrentGuild(null); return; }
    try {
      const stored = localStorage.getItem('selectedGuild');
      if (stored) {
        const guild = JSON.parse(stored) as StoredGuild;
        if (guild.id === guildId) setCurrentGuild(guild);
      }
    } catch { /* ignore */ }
  }, [guildId]);

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen w-64 bg-discord-dark flex flex-col border-r border-discord-lighter/30
        z\-50 transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
    >
      {/* Brand */}
      <div className="px-4 py-5 border-b border-discord-lighter/30 flex items-center justify-between">
        <NavLink to="/guilds" className="flex items-center gap-3 min-w-0" onClick={onClose}>
          {currentGuild ? (
            getGuildIconUrl(currentGuild) ? (
              <img
                src={getGuildIconUrl(currentGuild)!}
                alt=""
                className="w-9 h-9 rounded-xl flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-discord-lighter flex items-center justify-center text-discord-muted font-bold text-xs flex-shrink-0">
                {currentGuild.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2)}
              </div>
            )
          ) : (
            <div className="w-9 h-9 rounded-xl bg-discord-blurple flex items-center justify-center flex-shrink-0">
              <Bot size={20} className="text-white" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-discord-white truncate">
              {currentGuild ? currentGuild.name : 'Vapiano Bot'}
            </h1>
            <p className="text-xs text-discord-muted">Panel de control</p>
          </div>
        </NavLink>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-discord-lighter text-discord-muted hover:text-discord-white transition-colors"
          aria-label="Cerrar menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {guildId &&
          modules.map((mod) => (
            <NavLink
              key={mod.path}
              to={`/guild/${guildId}${mod.path}`}
              end={mod.path === ''}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <mod.icon size={18} />
              <span>{mod.label}</span>
            </NavLink>
          ))}

        {!guildId && (
          <div className="px-4 py-8 text-center text-discord-muted text-sm">
            Selecciona un servidor para administrar
          </div>
        )}
      </nav>

      {/* User */}
      {user && (
        <div className="p-3 border-t border-discord-lighter/30">
          <div className="flex items-center gap-3 px-2">
            <img
              src={getAvatarUrl(user, 32)}
              alt={user.username}
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-discord-white truncate">
                {user.globalName || user.username}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-discord-lighter text-discord-muted hover:text-discord-red transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}