import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { welcome as welcomeApi, config as configApi } from '@/lib/api';
import Card from '@/components/Card';
import Toggle from '@/components/Toggle';
import Input, { Textarea } from '@/components/Input';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import toast from 'react-hot-toast';

export default function Welcome() {
  const { guildId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

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
  const [joinRoleIds, setJoinRoleIds] = useState('');

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    welcomeApi.get(guildId)
      .then((data) => {
        setWelcomeEnabled(data.welcomeEnabled ?? false);
        setWelcomeChannelId(data.welcomeChannelId ?? '');
        setWelcomeMessage(data.welcomeMessage ?? '');
        setWelcomeImageEnabled(data.welcomeImageEnabled ?? false);
        setFarewellEnabled(data.farewellEnabled ?? false);
        setFarewellChannelId(data.farewellChannelId ?? '');
        setFarewellMessage(data.farewellMessage ?? '');
        setJoinRoleIds((data.joinRoleIds ?? []).join(', '));
      })
      .catch((err) => setError(err.message || 'Failed to load welcome settings'))
      .finally(() => setLoading(false));
  }, [guildId, retryCount]);

  const toggleSetting = async (key: string, value: boolean) => {
    if (!guildId) return;
    try {
      await configApi.update(guildId, { [key]: value });
      toast.success(`${key.replace('Enabled', '')} ${value ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to update setting');
    }
  };

  const save = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      const roleIds = joinRoleIds.split(',').map((s) => s.trim()).filter(Boolean);
      await welcomeApi.update(guildId, {
        welcomeChannelId: welcomeChannelId || null,
        welcomeMessage: welcomeMessage || null,
        welcomeImageEnabled,
        farewellChannelId: farewellChannelId || null,
        farewellMessage: farewellMessage || null,
        joinRoleIds: roleIds,
      });
      toast.success('Welcome settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Loading welcome settings..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-discord-red text-lg font-semibold mb-2">Failed to load welcome settings</p>
        <p className="text-discord-muted text-sm mb-4">{error}</p>
        <button onClick={() => setRetryCount((c) => c + 1)} className="px-4 py-2 bg-discord-blurple text-white rounded-lg text-sm hover:bg-discord-blurple/80 transition-colors">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Welcome & Farewell</h1>
        <p className="text-discord-muted mt-1">Configure welcome/farewell messages and auto-roles</p>
      </div>

      <div className="space-y-6">
        <Card title="Welcome Module">
          <div className="space-y-4 mt-3">
            <Toggle
              label="Enable Welcome Messages"
              description="Send a welcome message when a user joins"
              enabled={welcomeEnabled}
              onChange={(v) => { setWelcomeEnabled(v); toggleSetting('welcomeEnabled', v); }}
            />
            <Toggle
              label="Welcome Image Card"
              description="Generate a welcome image card with the user's avatar"
              enabled={welcomeImageEnabled}
              onChange={(v) => setWelcomeImageEnabled(v)}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Welcome Channel ID"
                placeholder="Channel ID"
                value={welcomeChannelId}
                onChange={(e) => setWelcomeChannelId(e.target.value)}
              />
            </div>
            <Textarea
              label="Welcome Message"
              placeholder="Bienvenido {user} ! Use {user}, {server}, {memberCount}"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
            />
          </div>
        </Card>

        <Card title="Farewell Module">
          <div className="space-y-4 mt-3">
            <Toggle
              label="Enable Farewell Messages"
              description="Send a farewell message when a user leaves"
              enabled={farewellEnabled}
              onChange={(v) => { setFarewellEnabled(v); toggleSetting('farewellEnabled', v); }}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Farewell Channel ID"
                placeholder="Channel ID"
                value={farewellChannelId}
                onChange={(e) => setFarewellChannelId(e.target.value)}
              />
            </div>
            <Textarea
              label="Farewell Message"
              placeholder="Goodbye {user}, we'll miss you!"
              value={farewellMessage}
              onChange={(e) => setFarewellMessage(e.target.value)}
            />
          </div>
        </Card>

        <Card title="Auto-Join Roles">
          <div className="mt-3">
            <Input
              label="Role IDs (comma-separated)"
              placeholder="123456789, 987654321"
              value={joinRoleIds}
              onChange={(e) => setJoinRoleIds(e.target.value)}
            />
            <p className="text-xs text-discord-muted mt-1">Roles automatically assigned to new members</p>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
