import { NavLink, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings,
  UserPlus,
  Trophy,
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
  X,
} from 'lucide-react';
import { useAuth, getAvatarUrl } from '@/hooks/useAuth';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const modules = [
  { path: '', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/config', icon: Settings, label: 'General Config' },
  { path: '/welcome', icon: HandMetal, label: 'Welcome / Farewell' },
  { path: '/invites', icon: UserPlus, label: 'Invites' },
  { path: '/leveling', icon: Trophy, label: 'Leveling' },
  { path: '/moderation', icon: Shield, label: 'Moderation' },
  { path: '/automod', icon: ShieldAlert, label: 'AutoMod' },
  { path: '/tickets', icon: Ticket, label: 'Tickets' },
  { path: '/automation', icon: Bot, label: 'Automation' },
  { path: '/reactionroles', icon: Tags, label: 'Reaction Roles' },
  { path: '/starboard', icon: Sparkles, label: 'Starboard' },
  { path: '/reputation', icon: Star, label: 'Reputation' },
  { path: '/giveaways', icon: Gift, label: 'Giveaways' },
  { path: '/suggestions', icon: Lightbulb, label: 'Suggestions' },
  { path: '/sticky', icon: StickyNote, label: 'Sticky Messages' },
  { path: '/logging', icon: ScrollText, label: 'Logging' },
  { path: '/backups', icon: Database, label: 'Backups' },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { guildId } = useParams();
  const { user, logout } = useAuth();

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen w-64 bg-discord-dark flex flex-col border-r border-discord-lighter/30
        z-50 transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
    >
      {/* Brand */}
      <div className="px-4 py-5 border-b border-discord-lighter/30 flex items-center justify-between">
        <NavLink to="/guilds" className="flex items-center gap-3" onClick={onClose}>
          <div className="w-9 h-9 rounded-xl bg-discord-blurple flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-discord-white">Vapiano Bot</h1>
            <p className="text-xs text-discord-muted">Dashboard</p>
          </div>
        </NavLink>
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg hover:bg-discord-lighter text-discord-muted hover:text-discord-white transition-colors"
          aria-label="Close menu"
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
            Select a server to manage
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
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
