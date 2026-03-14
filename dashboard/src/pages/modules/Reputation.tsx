import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { reputation } from '@/lib/api';
import Card from '@/components/Card';
import Loader from '@/components/Loader';
import Table from '@/components/Table';

interface RepEntry {
  userId: string;
  rep: number;
}

interface RecentRep {
  id: string;
  userId: string;
  giverId: string;
  reason: string | null;
  createdAt: string;
}

export default function Reputation() {
  const { guildId } = useParams();
  const [leaderboard, setLeaderboard] = useState<RepEntry[]>([]);
  const [recent, setRecent] = useState<RecentRep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      reputation.leaderboard(guildId),
      reputation.recent(guildId),
    ])
      .then(([lb, rc]) => {
        setLeaderboard(lb);
        setRecent(rc);
      })
      .catch((err) => setError(err.message || 'Failed to load reputation data'))
      .finally(() => setLoading(false));
  }, [guildId, retryCount]);

  if (loading) return <Loader text="Loading reputation..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-discord-red text-lg font-semibold mb-2">Failed to load reputation</p>
        <p className="text-discord-muted text-sm mb-4">{error}</p>
        <button onClick={() => setRetryCount((c) => c + 1)} className="px-4 py-2 bg-discord-blurple text-white rounded-lg text-sm hover:bg-discord-blurple/80 transition-colors">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Reputation</h1>
        <p className="text-discord-muted mt-1">View reputation leaderboard and recent activity</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Leaderboard">
          {leaderboard.length === 0 ? (
            <p className="text-discord-muted text-sm py-4">No reputation data yet.</p>
          ) : (
            <div className="space-y-2 mt-3">
              {leaderboard.slice(0, 20).map((entry, i) => (
                <div key={entry.userId} className="flex items-center justify-between py-2 px-3 rounded-lg bg-discord-darker/50">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-discord-muted w-6">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </span>
                    <span className="text-sm text-discord-white font-mono">{entry.userId}</span>
                  </div>
                  <span className="text-sm font-bold text-discord-green">{entry.rep} rep</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent Activity">
          {recent.length === 0 ? (
            <p className="text-discord-muted text-sm py-4">No recent reputation activity.</p>
          ) : (
            <div className="space-y-2 mt-3">
              {recent.slice(0, 20).map((entry) => (
                <div key={entry.id} className="py-2 px-3 rounded-lg bg-discord-darker/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-discord-muted">
                      <span className="font-mono">{entry.giverId.slice(0, 8)}</span> → <span className="font-mono">{entry.userId.slice(0, 8)}</span>
                    </span>
                    <span className="text-xs text-discord-muted">{new Date(entry.createdAt).toLocaleDateString()}</span>
                  </div>
                  {entry.reason && (
                    <p className="text-xs text-discord-light mt-1">{entry.reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
