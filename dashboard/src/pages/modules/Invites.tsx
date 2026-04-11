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
      .then((data) => setLeaderboard(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [guildId]);

  if (configLoading || loading) return <Loader text="Cargando invitaciones..." />;

  const totalValid = leaderboard.reduce((s, e) => s + e.valid, 0);
  const totalFake = leaderboard.reduce((s, e) => s + e.fake, 0);
  const totalLeaves = leaderboard.reduce((s, e) => s + e.leaves, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Seguimiento de invitaciones</h1>
        <p className="text-discord-muted mt-1">Mira quién está invitando miembros a tu servidor</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total de invitadores" value={leaderboard.length} icon={UserPlus} color="text-discord-blurple" />
        <StatCard label="Invitaciones válidas" value={totalValid} icon={TrendingUp} color="text-discord-green" />
        <StatCard label="Invitaciones falsas" value={totalFake} icon={UserMinus} color="text-discord-red" />
        <StatCard label="Se fueron tras entrar" value={totalLeaves} icon={UserMinus} color="text-discord-yellow" />
      </div>

      <Card title="Clasificacion de invitaciones">
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
            { key: 'inviterTag', label: 'Usuario' },
            {
              key: 'valid',
               label: 'Válidas',
              render: (item: InviteEntry) => (
                <span className="text-discord-green font-medium">{item.valid}</span>
              ),
            },
            {
              key: 'fake',
               label: 'Falsas',
              render: (item: InviteEntry) => (
                <span className="text-discord-red">{item.fake}</span>
              ),
            },
            {
              key: 'leaves',
               label: 'Salidas',
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
          emptyMessage="Aun no hay datos de invitaciones. Apareceran cuando entren miembros."
        />
      </Card>
    </div>
  );
}
