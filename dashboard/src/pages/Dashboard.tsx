import { useGuild } from '@/hooks/useGuild';
import Loader from '@/components/Loader';
import StatCard from '@/components/StatCard';
import Card from '@/components/Card';
import { Users, Hash, ShieldCheck, MessageSquare, UserPlus, Trophy, Ticket as TicketIcon, Bot } from 'lucide-react';

export default function Dashboard() {
  const { stats, loading, error } = useGuild();

  if (loading) return <Loader text="Loading dashboard..." />;
  if (error) return <div className="text-discord-red text-center py-8">{error}</div>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Server Dashboard</h1>
        <p className="text-discord-muted mt-1">Overview of your server activity and stats</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Members"
          value={stats?.members ?? '-'}
          icon={Users}
          color="text-discord-blurple"
        />
        <StatCard
          label="Online"
          value={stats?.online ?? '-'}
          icon={Users}
          color="text-discord-green"
        />
        <StatCard
          label="Channels"
          value={stats?.channels ?? '-'}
          icon={Hash}
          color="text-discord-yellow"
        />
        <StatCard
          label="Roles"
          value={stats?.roles ?? '-'}
          icon={ShieldCheck}
          color="text-discord-fuchsia"
        />
      </div>

      {/* Module Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Invites" className="text-center">
          <div className="flex items-center justify-center gap-3 mt-2">
            <UserPlus size={20} className="text-discord-blurple" />
            <span className="text-2xl font-bold text-discord-white">
              {stats?.totalInvites ?? 0}
            </span>
            <span className="text-sm text-discord-muted">total invites</span>
          </div>
        </Card>

        <Card title="Leveling" className="text-center">
          <div className="flex items-center justify-center gap-3 mt-2">
            <Trophy size={20} className="text-discord-yellow" />
            <span className="text-2xl font-bold text-discord-white">
              {stats?.activeLeveling ?? 0}
            </span>
            <span className="text-sm text-discord-muted">active members</span>
          </div>
        </Card>

        <Card title="Moderation" className="text-center">
          <div className="flex items-center justify-center gap-3 mt-2">
            <ShieldCheck size={20} className="text-discord-red" />
            <span className="text-2xl font-bold text-discord-white">
              {stats?.modActions ?? 0}
            </span>
            <span className="text-sm text-discord-muted">mod actions</span>
          </div>
        </Card>

        <Card title="Tickets" className="text-center">
          <div className="flex items-center justify-center gap-3 mt-2">
            <TicketIcon size={20} className="text-discord-green" />
            <span className="text-2xl font-bold text-discord-white">
              {stats?.openTickets ?? 0}
            </span>
            <span className="text-sm text-discord-muted">open tickets</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
