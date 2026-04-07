import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { config as configApi, stats as statsApi } from '@/lib/api';

interface GuildConfig {
  [key: string]: any;
}

interface GuildStats {
  members: number;
  online: number;
  channels: number;
  roles: number;
  [key: string]: any;
}

interface GuildContextType {
  guildId: string | undefined;
  config: GuildConfig | null;
  stats: GuildStats | null;
  loading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
  updateConfig: (data: Partial<GuildConfig>) => Promise<void>;
}

const GuildContext = createContext<GuildContextType>({
  guildId: undefined,
  config: null,
  stats: null,
  loading: true,
  error: null,
  refreshConfig: async () => {},
  updateConfig: async () => {},
});

export function GuildProvider({ children }: { children: React.ReactNode }) {
  const { guildId } = useParams<{ guildId: string }>();
  const [config, setConfig] = useState<GuildConfig | null>(null);
  const [guildStats, setGuildStats] = useState<GuildStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    try {
      const [configData, statsData] = await Promise.all([
        configApi.get(guildId),
        statsApi.get(guildId).catch(() => null),
      ]);
      setConfig(configData);
      setGuildStats(statsData);
    } catch (err: any) {
      setError(err.message || 'No se pudieron cargar los datos del servidor');
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refreshConfig = useCallback(async () => {
    if (!guildId) return;
    try {
      const data = await configApi.get(guildId);
      setConfig(data);
    } catch {
      // ignore
    }
  }, [guildId]);

  const updateConfig = useCallback(
    async (data: Partial<GuildConfig>) => {
      if (!guildId) return;
      const updated = await configApi.update(guildId, data);
      setConfig((prev) => ({ ...prev, ...updated }));
    },
    [guildId]
  );

  const value = useMemo(
    () => ({ guildId, config, stats: guildStats, loading, error, refreshConfig, updateConfig }),
    [guildId, config, guildStats, loading, error, refreshConfig, updateConfig],
  );

  return (
    <GuildContext.Provider value={value}>
      {children}
    </GuildContext.Provider>
  );
}

export function useGuild() {
  return useContext(GuildContext);
}
