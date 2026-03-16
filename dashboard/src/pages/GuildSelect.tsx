import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { guilds as guildsApi } from '@/lib/api';
import { useAuth, getAvatarUrl } from '@/hooks/useAuth';
import Loader from '@/components/Loader';
import { ChevronRight, Plus } from 'lucide-react';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  botPresent: boolean;
}

function getGuildIcon(guild: Guild, size = 64): string {
  if (guild.icon) {
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=${size}`;
  }
  return '';
}

function getGuildAcronym(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3);
}

export default function GuildSelect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [guildList, setGuildList] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    guildsApi
      .list()
      .then((data) => setGuildList(data.guilds || data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-discord-darker">
        <Loader text="Cargando tus servidores..." />
      </div>
    );
  }

  const withBot = guildList.filter((g) => g.botPresent);
  const withoutBot = guildList.filter((g) => !g.botPresent);

  return (
    <div className="min-h-screen bg-discord-darker py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          {user && (
            <img
              src={getAvatarUrl(user, 80)}
              alt=""
              className="w-16 h-16 rounded-full mx-auto mb-4 ring-2 ring-discord-blurple"
            />
          )}
          <h1 className="text-2xl font-bold text-discord-white">Selecciona un servidor</h1>
          <p className="text-discord-muted mt-1">Elige un servidor para administrar con Vapiano Bot</p>
        </div>

        {/* Servers with bot */}
        {withBot.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-discord-muted mb-3 px-1">
              Tus servidores
            </h2>
            <div className="space-y-2">
              {withBot.map((guild) => (
                <button
                  key={guild.id}
                  onClick={() => navigate(`/guild/${guild.id}`)}
                  className="w-full flex items-center gap-4 p-4 bg-discord-light hover:bg-discord-lighter rounded-xl transition-colors group"
                >
                  {guild.icon ? (
                    <img
                      src={getGuildIcon(guild, 48)}
                      alt=""
                      className="w-12 h-12 rounded-xl"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-discord-lighter flex items-center justify-center text-discord-muted font-semibold text-sm">
                      {getGuildAcronym(guild.name)}
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="text-discord-white font-medium">{guild.name}</p>
                    <p className="text-xs text-discord-muted">Haz clic para administrar</p>
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-discord-muted group-hover:text-discord-blurple transition-colors"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Servers without bot */}
        {withoutBot.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-discord-muted mb-3 px-1">
              Invitar Vapiano Bot
            </h2>
            <div className="space-y-2">
              {withoutBot.map((guild) => (
                <div
                  key={guild.id}
                  className="w-full flex items-center gap-4 p-4 bg-discord-light/50 rounded-xl"
                >
                  {guild.icon ? (
                    <img
                      src={getGuildIcon(guild, 48)}
                      alt=""
                      className="w-12 h-12 rounded-xl opacity-60"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-discord-lighter flex items-center justify-center text-discord-muted/50 font-semibold text-sm">
                      {getGuildAcronym(guild.name)}
                    </div>
                  )}
                  <div className="flex-1 text-left">
                    <p className="text-discord-muted font-medium">{guild.name}</p>
                    <p className="text-xs text-discord-muted/60">Bot aun no agregado</p>
                  </div>
                  <a
                    href={`https://discord.com/oauth2/authorize?client_id=${import.meta.env.VITE_CLIENT_ID || ''}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-discord-blurple hover:bg-discord-blurple/80 text-white transition-colors"
                  >
                    <Plus size={14} />
                    Invitar
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {guildList.length === 0 && (
          <div className="text-center py-12 text-discord-muted">
            <p>No se encontraron servidores. Asegurate de tener el permiso "Manage Server".</p>
          </div>
        )}
      </div>
    </div>
  );
}
