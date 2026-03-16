import { useEffect, useState } from 'react';
import { useGuild } from '@/hooks/useGuild';
import Card from '@/components/Card';
import Toggle from '@/components/Toggle';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import toast from 'react-hot-toast';

export default function GeneralConfig() {
  const { config, loading, error, updateConfig } = useGuild();
  const [saving, setSaving] = useState(false);

  // Local state for editable fields
  const [welcomeChannel, setWelcomeChannel] = useState('');
  const [farewellChannel, setFarewellChannel] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [farewellMessage, setFarewellMessage] = useState('');
  const [modLogChannel, setModLogChannel] = useState('');
  const [messageLogChannel, setMessageLogChannel] = useState('');
  const [joinLeaveLogChannel, setJoinLeaveLogChannel] = useState('');
  const [levelUpChannel, setLevelUpChannel] = useState('');
  const [joinRoleId, setJoinRoleId] = useState('');
  const [muteRoleId, setMuteRoleId] = useState('');

  // Sync local state from config whenever config changes (including guild switch)
  useEffect(() => {
    if (!config) return;
    setWelcomeChannel(config.welcomeChannelId || '');
    setFarewellChannel(config.farewellChannelId || '');
    setWelcomeMessage(config.welcomeMessage || '');
    setFarewellMessage(config.farewellMessage || '');
    setModLogChannel(config.modLogChannelId || '');
    setMessageLogChannel(config.messageLogChannelId || '');
    setJoinLeaveLogChannel(config.joinLeaveLogChannelId || '');
    setLevelUpChannel(config.levelUpChannelId || '');
    setJoinRoleId(config.joinRoleId || '');
    setMuteRoleId(config.muteRoleId || '');
  }, [config]);

  if (loading) return <Loader text="Cargando configuracion..." />;
  if (error) return <div className="text-discord-red text-center py-8">{error}</div>;

  const toggleModule = async (module: string, enabled: boolean) => {
    try {
      await updateConfig({ [`${module}Enabled`]: enabled });
      toast.success(`${module} ${enabled ? 'activado' : 'desactivado'}`);
    } catch {
      toast.error('No se pudo actualizar el modulo');
    }
  };

  const saveGeneral = async () => {
    setSaving(true);
    try {
      await updateConfig({
        welcomeChannelId: welcomeChannel || null,
        farewellChannelId: farewellChannel || null,
        welcomeMessage: welcomeMessage || null,
        farewellMessage: farewellMessage || null,
        modLogChannelId: modLogChannel || null,
        messageLogChannelId: messageLogChannel || null,
        joinLeaveLogChannelId: joinLeaveLogChannel || null,
        levelUpChannelId: levelUpChannel || null,
        joinRoleId: joinRoleId || null,
        muteRoleId: muteRoleId || null,
      });
      toast.success('Configuracion guardada');
    } catch {
      toast.error('No se pudo guardar la configuracion');
    } finally {
      setSaving(false);
    }
  };

  const modules = [
    { key: 'invites', label: 'Seguimiento de invitaciones', desc: 'Rastrea quien invito a quien al servidor' },
    { key: 'leveling', label: 'Sistema de niveles', desc: 'Niveles por XP con recompensas de roles' },
    { key: 'moderation', label: 'Moderacion', desc: 'Advertir, silenciar, expulsar, banear y mas' },
    { key: 'automod', label: 'AutoMod', desc: 'Filtro automatico de spam, mayusculas, enlaces y palabras' },
    { key: 'tickets', label: 'Sistema de tickets', desc: 'Tickets de soporte con botones' },
    { key: 'automation', label: 'Automatizacion', desc: 'Autorespuestas, mensajes programados, encuestas' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Configuracion general</h1>
        <p className="text-discord-muted mt-1">Activa/desactiva modulos y configura ajustes principales</p>
      </div>

      {/* Module toggles */}
      <Card title="Modulos" description="Activa o desactiva modulos del bot" className="mb-6">
        <div className="space-y-4">
          {modules.map((mod) => (
            <Toggle
              key={mod.key}
              enabled={config?.[`${mod.key}Enabled`] ?? false}
              onChange={(val) => toggleModule(mod.key, val)}
              label={mod.label}
              description={mod.desc}
            />
          ))}
        </div>
      </Card>

      {/* Welcome & Farewell */}
      <Card title="Bienvenida y despedida" description="Configura mensajes de entrada y salida" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input
            label="ID del canal de bienvenida"
            placeholder="Ingresa ID del canal"
            value={welcomeChannel}
            onChange={(e) => setWelcomeChannel(e.target.value)}
          />
          <Input
            label="ID del canal de despedida"
            placeholder="Ingresa ID del canal"
            value={farewellChannel}
            onChange={(e) => setFarewellChannel(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Mensaje de bienvenida"
            placeholder="Bienvenido {user} a {server}!"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
          />
          <Input
            label="Mensaje de despedida"
            placeholder="{user} ha salido del servidor."
            value={farewellMessage}
            onChange={(e) => setFarewellMessage(e.target.value)}
          />
        </div>
        <p className="text-xs text-discord-muted mt-3">
          Variables: {'{user}'} {'{username}'} {'{server}'} {'{memberCount}'} {'{inviter}'} {'{inviteCount}'}
        </p>
      </Card>

      {/* Logging */}
      <Card title="Canales de registro" description="Define canales para varios tipos de registro" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="ID del canal de registro de moderacion"
            placeholder="ID del canal"
            value={modLogChannel}
            onChange={(e) => setModLogChannel(e.target.value)}
          />
          <Input
            label="ID del canal de registro de mensajes"
            placeholder="ID del canal"
            value={messageLogChannel}
            onChange={(e) => setMessageLogChannel(e.target.value)}
          />
          <Input
            label="ID del canal de registro de entradas/salidas"
            placeholder="ID del canal"
            value={joinLeaveLogChannel}
            onChange={(e) => setJoinLeaveLogChannel(e.target.value)}
          />
          <Input
            label="ID del canal de subida de nivel"
            placeholder="ID del canal (vacio = mismo canal)"
            value={levelUpChannel}
            onChange={(e) => setLevelUpChannel(e.target.value)}
          />
        </div>
      </Card>

      {/* Roles */}
      <Card title="Roles automaticos" description="Roles asignados automaticamente" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="ID del rol al entrar"
            placeholder="Rol dado al entrar"
            value={joinRoleId}
            onChange={(e) => setJoinRoleId(e.target.value)}
          />
          <Input
            label="ID del rol de silencio"
            placeholder="Rol usado para silenciar"
            value={muteRoleId}
            onChange={(e) => setMuteRoleId(e.target.value)}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveGeneral} loading={saving}>
          Guardar configuracion
        </Button>
      </div>
    </div>
  );
}
