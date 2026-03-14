import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { giveaways } from '@/lib/api';
import Card from '@/components/Card';
import Loader from '@/components/Loader';

interface Giveaway {
  id: string;
  prize: string;
  description: string | null;
  winners: number;
  entries: string[];
  winnerIds: string[];
  endsAt: string;
  ended: boolean;
  hostId: string;
  createdAt: string;
}

export default function Giveaways() {
  const { guildId } = useParams();
  const [active, setActive] = useState<Giveaway[]>([]);
  const [ended, setEnded] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      giveaways.list(guildId, 'active'),
      giveaways.list(guildId, 'ended'),
    ])
      .then(([a, e]) => {
        setActive(a);
        setEnded(e);
      })
      .catch((err) => setError(err.message || 'Failed to load giveaways'))
      .finally(() => setLoading(false));
  }, [guildId, retryCount]);

  if (loading) return <Loader text="Loading giveaways..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-discord-red text-lg font-semibold mb-2">Failed to load giveaways</p>
        <p className="text-discord-muted text-sm mb-4">{error}</p>
        <button onClick={() => setRetryCount((c) => c + 1)} className="px-4 py-2 bg-discord-blurple text-white rounded-lg text-sm hover:bg-discord-blurple/80 transition-colors">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Giveaways</h1>
        <p className="text-discord-muted mt-1">View and manage giveaways. Create new ones with <code>/giveaway start</code> in Discord.</p>
      </div>

      <div className="space-y-6">
        <Card title={`Active Giveaways (${active.length})`}>
          {active.length === 0 ? (
            <p className="text-discord-muted text-sm py-4">No active giveaways.</p>
          ) : (
            <div className="space-y-3 mt-3">
              {active.map((g) => (
                <div key={g.id} className="p-4 rounded-lg bg-discord-darker/50 border border-discord-lighter/20">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold text-discord-white">🎉 {g.prize}</h3>
                    <span className="text-xs px-2 py-1 bg-discord-green/20 text-discord-green rounded-full">Active</span>
                  </div>
                  {g.description && <p className="text-sm text-discord-light mb-2">{g.description}</p>}
                  <div className="flex gap-4 text-xs text-discord-muted">
                    <span>{g.entries.length} entries</span>
                    <span>{g.winners} winner(s)</span>
                    <span>Ends: {new Date(g.endsAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title={`Ended Giveaways (${ended.length})`}>
          {ended.length === 0 ? (
            <p className="text-discord-muted text-sm py-4">No ended giveaways.</p>
          ) : (
            <div className="space-y-3 mt-3">
              {ended.slice(0, 10).map((g) => (
                <div key={g.id} className="p-4 rounded-lg bg-discord-darker/50 border border-discord-lighter/20">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-discord-white">{g.prize}</h3>
                    <span className="text-xs px-2 py-1 bg-discord-muted/20 text-discord-muted rounded-full">Ended</span>
                  </div>
                  <div className="flex gap-4 text-xs text-discord-muted">
                    <span>{g.entries.length} entries</span>
                    <span>{g.winnerIds.length} winner(s)</span>
                    <span>Ended: {new Date(g.endsAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
