import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { suggestions } from '@/lib/api';
import Card from '@/components/Card';
import Loader from '@/components/Loader';

interface Suggestion {
  id: string;
  userId: string;
  content: string;
  status: string;
  upvotes: string[];
  downvotes: string[];
  staffNote: string | null;
  reviewedBy: string | null;
  createdAt: string;
}

export default function Suggestions() {
  const { guildId } = useParams();
  const [items, setItems] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    suggestions
      .list(guildId, filter || undefined)
      .then(setItems)
      .catch((err) => setError(err.message || 'Failed to load suggestions'))
      .finally(() => setLoading(false));
  }, [guildId, filter, retryCount]);

  if (loading) return <Loader text="Loading suggestions..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-discord-red text-lg font-semibold mb-2">Failed to load suggestions</p>
        <p className="text-discord-muted text-sm mb-4">{error}</p>
        <button onClick={() => setRetryCount((c) => c + 1)} className="px-4 py-2 bg-discord-blurple text-white rounded-lg text-sm hover:bg-discord-blurple/80 transition-colors">Retry</button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-discord-yellow/20 text-discord-yellow',
    approved: 'bg-discord-green/20 text-discord-green',
    denied: 'bg-discord-red/20 text-discord-red',
    implemented: 'bg-discord-blurple/20 text-discord-blurple',
  };

  const statusEmojis: Record<string, string> = {
    pending: '⏳',
    approved: '✅',
    denied: '❌',
    implemented: '🚀',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Suggestions</h1>
        <p className="text-discord-muted mt-1">View and manage community suggestions</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {['', 'pending', 'approved', 'denied', 'implemented'].map((status) => (
          <button
            key={status}
            onClick={() => { setFilter(status); setLoading(true); }}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === status
                ? 'bg-discord-blurple text-white'
                : 'bg-discord-lighter/30 text-discord-muted hover:text-discord-white'
            }`}
          >
            {status ? `${statusEmojis[status]} ${status.charAt(0).toUpperCase() + status.slice(1)}` : 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <Card><p className="text-discord-muted text-sm py-4">No suggestions found.</p></Card>
        ) : (
          items.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[s.status] || ''}`}>
                      {statusEmojis[s.status]} {s.status}
                    </span>
                    <span className="text-xs text-discord-muted font-mono">{s.id.slice(0, 8)}</span>
                  </div>
                  <p className="text-sm text-discord-white">{s.content}</p>
                  {s.staffNote && (
                    <p className="text-xs text-discord-muted mt-2 italic">Staff note: {s.staffNote}</p>
                  )}
                </div>
                <div className="text-right ml-4">
                  <div className="flex gap-2 text-sm">
                    <span className="text-discord-green">👍 {s.upvotes.length}</span>
                    <span className="text-discord-red">👎 {s.downvotes.length}</span>
                  </div>
                  <span className="text-xs text-discord-muted">{new Date(s.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
