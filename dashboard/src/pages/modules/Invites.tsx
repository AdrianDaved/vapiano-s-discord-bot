import { useEffect, useState } from 'react';
import { useGuild } from '@/hooks/useGuild';
import { invites as invitesApi } from '@/lib/api';
import Card from '@/components/Card';
import Table from '@/components/Table';
import Loader from '@/components/Loader';
import { UserPlus, Trophy, TrendingUp, UserMinus } from 'lucide-react';
import StatCard from '@/components/StatCard';

interface InviteEntry {
  inviterId: string;
  inviterTag: string;
  valid: number;
  fake: number;
  leaves: number;
  total: number;
}

export default function Invites() {
  const { guildId, loading: configLoading } = useGuild();
  const [leaderboard, setLeaderboard] = useState<InviteEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!guildId) return;
    invitesApi
      .leaderboard(guildId)
      .then((data) => setLeaderboard(data.leaderboard || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  if (configLoading || loading) return <Loader text="Loading invites..." />;

  const totalValid = leaderboard.reduce((s, e) => s + e.valid, 0);
  const totalFake = leaderboard.reduce((s, e) => s + e.fake, 0);
  const totalLeaves = leaderboard.reduce((s, e) => s + e.leaves, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Invite Tracker</h1>
        <p className="text-discord-muted mt-1">See who is inviting members to your server</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Inviters" value={leaderboard.length} icon={UserPlus} color="text-discord-blurple" />
        <StatCard label="Valid Invites" value={totalValid} icon={TrendingUp} color="text-discord-green" />
        <StatCard label="Fake Invites" value={totalFake} icon={UserMinus} color="text-discord-red" />
        <StatCard label="Left After Join" value={totalLeaves} icon={UserMinus} color="text-discord-yellow" />
      </div>

      <Card title="Invite Leaderboard">
        <Table
          columns={[
            {
              key: 'rank',
              label: '#',
              render: (_item: InviteEntry, ) => {
                const idx = leaderboard.indexOf(_item);
                return (
                  <span className={idx < 3 ? 'font-bold text-discord-blurple' : ''}>
                    {idx + 1}
                  </span>
                );
              },
            },
            { key: 'inviterTag', label: 'User' },
            {
              key: 'valid',
              label: 'Valid',
              render: (item: InviteEntry) => (
                <span className="text-discord-green font-medium">{item.valid}</span>
              ),
            },
            {
              key: 'fake',
              label: 'Fake',
              render: (item: InviteEntry) => (
                <span className="text-discord-red">{item.fake}</span>
              ),
            },
            {
              key: 'leaves',
              label: 'Leaves',
              render: (item: InviteEntry) => (
                <span className="text-discord-yellow">{item.leaves}</span>
              ),
            },
            {
              key: 'total',
              label: 'Total',
              render: (item: InviteEntry) => (
                <span className="font-bold">{item.total}</span>
              ),
            },
          ]}
          data={leaderboard}
          emptyMessage="No invite data yet. Invites will appear as members join."
        />
      </Card>
    </div>
  );
}
