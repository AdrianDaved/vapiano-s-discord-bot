import { useEffect, useState } from 'react';
import { useGuild } from '@/hooks/useGuild';
import Loader from '@/components/Loader';
import StatCard from '@/components/StatCard';
import Card from '@/components/Card';
import { Users, Hash, ShieldCheck, UserPlus, Ticket as TicketIcon, Activity, MessageSquare, Star } from 'lucide-react';

interface StoredGuild { id: string; name: string; icon: string | null; }

function getGuildIconUrl(guild: StoredGuild, size = 128): string | null {
  if (!guild.icon) return null;
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=${size}`;
}

export default function Dashboard() {
  const { stats, loading, error } = useGuild();
  const [guild, setGuild] = useState<StoredGuild | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('selectedGuild');
      if (stored) setGuild(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  if (loading) return <Loader text="Cargando panel..." />;
  if (error) return <div className="text-discord-red text-center py-8">{error}</div>;

  const iconUrl = guild ? getGuildIconUrl(guild) : null;
  const acronym = guild?.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2) ?? '?';

  return (
    <div className="fade-in">
      {/* Server hero header */}
      <div className="relative rounded-2xl overflow-hidden mb-8 bg-gradient-to-br from-discord-blurple/20 via-discord-light to-discord-light border border-white/5" style={{ minHeight: 120 }}>
        <div className="absolute inset-0 bg-gradient-to-r from-discord-blurple/10 to-discord-fuchsia/5 pointer-events-none" />
        <div className="relative flex items-center gap-5 p-6">
          {iconUrl ? (
            <img src={iconUrl} alt="" className="w-16 h-16 rounded-2xl ring-2 ring-white/10 flex-shrink-0" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-discord-blurple/20 border border-discord-blurple/30 flex items-center justify-center text-discord-blurple font-bold text-xl flex-shrink-0">
              {acronym}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-discord-white">
              {guild?.name ?? 'Panel del servidor'}
            </h1>
            <p className="text-discord-muted text-sm mt-0.5 flex items-center gap-2">
              <span className="pulse-dot inline-block" />
              Bot activo · Resumen de actividad
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Miembros totales" value={stats?.members ?? '-'} icon={Users} accent="blue" />
        <StatCard label="En línea" value={stats?.online ?? '-'} icon={Activity} accent="green" />
        <StatCard label="Canales" value={stats?.channels ?? '-'} icon={Hash} accent="yellow" />
        <StatCard label="Roles" value={stats?.roles ?? '-'} icon={ShieldCheck} accent="pink" />
      </div>

      {/* Module quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="text-center !p-4">
          <div className="icon-glow-blue w-fit mx-auto mb-3"><UserPlus size={18} /></div>
          <p className="text-2xl font-bold text-discord-white tabular-nums">{stats?.totalInvites ?? 0}</p>
          <p className="text-xs text-discord-muted mt-1">Invitaciones</p>
        </Card>

        <Card className="text-center !p-4">
          <div className="icon-glow-red w-fit mx-auto mb-3"><ShieldCheck size={18} /></div>
          <p className="text-2xl font-bold text-discord-white tabular-nums">{stats?.modActions ?? 0}</p>
          <p className="text-xs text-discord-muted mt-1">Acciones mod</p>
        </Card>

        <Card className="text-center !p-4">
          <div className="icon-glow-green w-fit mx-auto mb-3"><TicketIcon size={18} /></div>
          <p className="text-2xl font-bold text-discord-white tabular-nums">{stats?.openTickets ?? 0}</p>
          <p className="text-xs text-discord-muted mt-1">Tickets abiertos</p>
        </Card>

        <Card className="text-center !p-4">
          <div className="icon-glow-yellow w-fit mx-auto mb-3"><Star size={18} /></div>
          <p className="text-2xl font-bold text-discord-white tabular-nums">{stats?.totalRep ?? 0}</p>
          <p className="text-xs text-discord-muted mt-1">Reputación total</p>
        </Card>
      </div>
    </div>
  );
}
