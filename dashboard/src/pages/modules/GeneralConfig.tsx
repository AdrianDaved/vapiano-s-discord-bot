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

  if (loading) return <Loader text="Loading config..." />;
  if (error) return <div className="text-discord-red text-center py-8">{error}</div>;

  const toggleModule = async (module: string, enabled: boolean) => {
    try {
      await updateConfig({ [`${module}Enabled`]: enabled });
      toast.success(`${module} ${enabled ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update module');
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
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const modules = [
    { key: 'invites', label: 'Invite Tracking', desc: 'Track who invited whom to the server' },
    { key: 'leveling', label: 'Leveling System', desc: 'XP-based leveling with role rewards' },
    { key: 'moderation', label: 'Moderation', desc: 'Warn, mute, kick, ban and more' },
    { key: 'automod', label: 'AutoMod', desc: 'Automatic spam, caps, links and word filtering' },
    { key: 'tickets', label: 'Ticket System', desc: 'Button-based support tickets' },
    { key: 'automation', label: 'Automation', desc: 'Auto-responses, scheduled messages, polls' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">General Configuration</h1>
        <p className="text-discord-muted mt-1">Enable/disable modules and configure core settings</p>
      </div>

      {/* Module toggles */}
      <Card title="Modules" description="Toggle bot modules on or off" className="mb-6">
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
      <Card title="Welcome & Farewell" description="Configure join/leave messages" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Input
            label="Welcome Channel ID"
            placeholder="Enter channel ID"
            value={welcomeChannel}
            onChange={(e) => setWelcomeChannel(e.target.value)}
          />
          <Input
            label="Farewell Channel ID"
            placeholder="Enter channel ID"
            value={farewellChannel}
            onChange={(e) => setFarewellChannel(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Welcome Message"
            placeholder="Welcome {user} to {server}!"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
          />
          <Input
            label="Farewell Message"
            placeholder="{user} has left the server."
            value={farewellMessage}
            onChange={(e) => setFarewellMessage(e.target.value)}
          />
        </div>
        <p className="text-xs text-discord-muted mt-3">
          Variables: {'{user}'} {'{username}'} {'{server}'} {'{memberCount}'} {'{inviter}'} {'{inviteCount}'}
        </p>
      </Card>

      {/* Logging */}
      <Card title="Log Channels" description="Set channels for various log types" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Mod Log Channel ID"
            placeholder="Channel ID"
            value={modLogChannel}
            onChange={(e) => setModLogChannel(e.target.value)}
          />
          <Input
            label="Message Log Channel ID"
            placeholder="Channel ID"
            value={messageLogChannel}
            onChange={(e) => setMessageLogChannel(e.target.value)}
          />
          <Input
            label="Join/Leave Log Channel ID"
            placeholder="Channel ID"
            value={joinLeaveLogChannel}
            onChange={(e) => setJoinLeaveLogChannel(e.target.value)}
          />
          <Input
            label="Level-Up Channel ID"
            placeholder="Channel ID (empty = same channel)"
            value={levelUpChannel}
            onChange={(e) => setLevelUpChannel(e.target.value)}
          />
        </div>
      </Card>

      {/* Roles */}
      <Card title="Auto Roles" description="Roles assigned automatically" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Join Role ID"
            placeholder="Role given on join"
            value={joinRoleId}
            onChange={(e) => setJoinRoleId(e.target.value)}
          />
          <Input
            label="Mute Role ID"
            placeholder="Role used for muting"
            value={muteRoleId}
            onChange={(e) => setMuteRoleId(e.target.value)}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveGeneral} loading={saving}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
