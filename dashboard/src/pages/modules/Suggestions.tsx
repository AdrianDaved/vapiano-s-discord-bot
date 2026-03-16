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

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  denied: 'Rechazada',
  implemented: 'Implementada',
};

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
      .catch((err) => setError(err.message || 'No se pudieron cargar las sugerencias'))
      .finally(() => setLoading(false));
  }, [guildId, filter, retryCount]);

  if (loading) return <Loader text="Cargando sugerencias..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-discord-red text-lg font-semibold mb-2">No se pudieron cargar las sugerencias</p>
        <p className="text-discord-muted text-sm mb-4">{error}</p>
        <button onClick={() => setRetryCount((c) => c + 1)} className="px-4 py-2 bg-discord-blurple text-white rounded-lg text-sm hover:bg-discord-blurple/80 transition-colors">Reintentar</button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Sugerencias</h1>
        <p className="text-discord-muted mt-1">Ver y administrar sugerencias de la comunidad</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['', 'pending', 'approved', 'denied', 'implemented'] as const).map((status) => (
          <button
            key={status}
            onClick={() => { setFilter(status); setLoading(true); }}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              filter === status
                ? 'bg-discord-blurple text-white'
                : 'bg-discord-lighter/30 text-discord-muted hover:text-discord-white'
            }`}
          >
            {status ? `${statusEmojis[status]} ${statusLabels[status]}` : 'Todas'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <Card><p className="text-discord-muted text-sm py-4">No se encontraron sugerencias.</p></Card>
        ) : (
          items.map((s) => (
            <Card key={s.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[s.status] || ''}`}>
                      {statusEmojis[s.status]} {statusLabels[s.status] || s.status}
                    </span>
                    <span className="text-xs text-discord-muted font-mono">{s.id.slice(0, 8)}</span>
                  </div>
                  <p className="text-sm text-discord-white">{s.content}</p>
                  {s.staffNote && (
                    <p className="text-xs text-discord-muted mt-2 italic">Nota del staff: {s.staffNote}</p>
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
