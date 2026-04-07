import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { welcome as welcomeApi, config as configApi, guilds as guildsApi } from '@/lib/api';
import Card from '@/components/Card';
import Toggle from '@/components/Toggle';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import ChannelSelect from '@/components/ChannelSelect';
import RoleMultiSelect from '@/components/RoleMultiSelect';
import VariableTextarea from '@/components/VariableTextarea';
import DiscordEmbedPreview from '@/components/DiscordEmbedPreview';
import toast from 'react-hot-toast';

const WELCOME_VARS = [
  { tag: '{user}', description: 'Mención @usuario' },
  { tag: '{username}', description: 'Nombre del usuario' },
  { tag: '{server}', description: 'Nombre del servidor' },
  { tag: '{memberCount}', description: 'Total de miembros' },
];

export default function Welcome() {
  const { guildId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Guild data
  const [guildChannels, setGuildChannels] = useState<{ id: string; name: string; type: number; parentId: string | null }[]>([]);
  const [guildRoles, setGuildRoles] = useState<{ id: string; name: string; color: number }[]>([]);

  // Welcome settings
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeChannelId, setWelcomeChannelId] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [welcomeImageEnabled, setWelcomeImageEnabled] = useState(false);

  // Farewell settings
  const [farewellEnabled, setFarewellEnabled] = useState(false);
  const [farewellChannelId, setFarewellChannelId] = useState('');
  const [farewellMessage, setFarewellMessage] = useState('');

  // Join roles
  const [joinRoleIds, setJoinRoleIds] = useState<string[]>([]);

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      welcomeApi.get(guildId),
      guildsApi.channels(guildId).catch(() => []),
      guildsApi.roles(guildId).catch(() => []),
    ])
      .then(([data, channels, roles]) => {
        setWelcomeEnabled(data.welcomeEnabled ?? false);
        setWelcomeChannelId(data.welcomeChannelId ?? '');
        setWelcomeMessage(data.welcomeMessage ?? '');
        setWelcomeImageEnabled(data.welcomeImageEnabled ?? false);
        setFarewellEnabled(data.farewellEnabled ?? false);
        setFarewellChannelId(data.farewellChannelId ?? '');
        setFarewellMessage(data.farewellMessage ?? '');
        setJoinRoleIds(data.joinRoleIds ?? []);
        setGuildChannels(channels);
        setGuildRoles(roles);
      })
      .catch((err) => setError(err.message || 'No se pudo cargar la configuración de bienvenida'))
      .finally(() => setLoading(false));
  }, [guildId, retryCount]);

  const toggleSetting = async (key: string, value: boolean) => {
    if (!guildId) return;
    try {
      await configApi.update(guildId, { [key]: value });
      toast.success(`${key.replace('Enabled', '')} ${value ? 'activado' : 'desactivado'}`);
    } catch {
      toast.error('No se pudo actualizar el ajuste');
    }
  };

  const save = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      await welcomeApi.update(guildId, {
        welcomeChannelId: welcomeChannelId || null,
        welcomeMessage: welcomeMessage || null,
        welcomeImageEnabled,
        farewellChannelId: farewellChannelId || null,
        farewellMessage: farewellMessage || null,
        joinRoleIds,
      });
      toast.success('Configuración de bienvenida guardada');
    } catch {
      toast.error('No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Cargando configuración de bienvenida..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-discord-red text-lg font-semibold mb-2">No se pudo cargar la configuración de bienvenida</p>
        <p className="text-discord-muted text-sm mb-4">{error}</p>
        <button onClick={() => setRetryCount((c) => c + 1)} className="px-4 py-2 bg-discord-blurple text-white rounded-lg text-sm hover:bg-discord-blurple/80 transition-colors">Reintentar</button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Bienvenida y despedida</h1>
        <p className="text-discord-muted mt-1">Configura mensajes de bienvenida/despedida y roles automáticos</p>
      </div>

      <div className="space-y-6">
        <Card title="Módulo de bienvenida">
          <div className="space-y-4 mt-3">
            <Toggle
              label="Activar mensajes de bienvenida"
              description="Enviar un mensaje cuando un usuario entra"
              enabled={welcomeEnabled}
              onChange={(v) => { setWelcomeEnabled(v); toggleSetting('welcomeEnabled', v); }}
            />
            <Toggle
              label="Tarjeta de imagen de bienvenida"
              description="Generar una tarjeta de bienvenida con el avatar del usuario"
              enabled={welcomeImageEnabled}
              onChange={(v) => setWelcomeImageEnabled(v)}
            />
            <ChannelSelect
              label="Canal de bienvenida"
              description="Canal donde se enviarán los mensajes de bienvenida"
              channels={guildChannels}
              value={welcomeChannelId}
              onChange={setWelcomeChannelId}
            />
            <VariableTextarea
              label="Mensaje de bienvenida"
              value={welcomeMessage}
              onChange={setWelcomeMessage}
              variables={WELCOME_VARS}
              placeholder="¡Bienvenido {user} al servidor {server}!"
              rows={3}
              maxLength={2000}
            />
            <DiscordEmbedPreview
              description={welcomeMessage}
            />
          </div>
        </Card>

        <Card title="Módulo de despedida">
          <div className="space-y-4 mt-3">
            <Toggle
              label="Activar mensajes de despedida"
              description="Enviar un mensaje cuando un usuario sale"
              enabled={farewellEnabled}
              onChange={(v) => { setFarewellEnabled(v); toggleSetting('farewellEnabled', v); }}
            />
            <ChannelSelect
              label="Canal de despedida"
              description="Canal donde se enviarán los mensajes de despedida"
              channels={guildChannels}
              value={farewellChannelId}
              onChange={setFarewellChannelId}
            />
            <VariableTextarea
              label="Mensaje de despedida"
              value={farewellMessage}
              onChange={setFarewellMessage}
              variables={WELCOME_VARS}
              placeholder="¡Adiós {username}, te vamos a extrañar!"
              rows={3}
              maxLength={2000}
            />
          </div>
        </Card>

        <Card title="Roles automáticos al entrar">
          <div className="mt-3">
            <RoleMultiSelect
              label="Roles de entrada automática"
              description="Roles asignados automáticamente a miembros nuevos al entrar al servidor"
              roles={guildRoles}
              selected={joinRoleIds}
              onChange={setJoinRoleIds}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>Guardar cambios</Button>
        </div>
      </div>
    </div>
  );
}
