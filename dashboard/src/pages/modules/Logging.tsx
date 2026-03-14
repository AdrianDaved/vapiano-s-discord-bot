import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { logging as loggingApi, config as configApi } from '@/lib/api';
import Card from '@/components/Card';
import Toggle from '@/components/Toggle';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import toast from 'react-hot-toast';

export default function Logging() {
  const { guildId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [loggingEnabled, setLoggingEnabled] = useState(false);
  const [modLogChannelId, setModLogChannelId] = useState('');
  const [messageLogChannelId, setMessageLogChannelId] = useState('');
  const [joinLeaveLogChannelId, setJoinLeaveLogChannelId] = useState('');
  const [auditLogChannelId, setAuditLogChannelId] = useState('');
  const [voiceLogChannelId, setVoiceLogChannelId] = useState('');

  useEffect(() => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    loggingApi.get(guildId)
      .then((data) => {
        setLoggingEnabled(data.loggingEnabled ?? false);
        setModLogChannelId(data.modLogChannelId ?? '');
        setMessageLogChannelId(data.messageLogChannelId ?? '');
        setJoinLeaveLogChannelId(data.joinLeaveLogChannelId ?? '');
        setAuditLogChannelId(data.auditLogChannelId ?? '');
        setVoiceLogChannelId(data.voiceLogChannelId ?? '');
      })
      .catch((err) => setError(err.message || 'Failed to load logging settings'))
      .finally(() => setLoading(false));
  }, [guildId, retryCount]);

  const save = async () => {
    if (!guildId) return;
    setSaving(true);
    try {
      await loggingApi.update(guildId, {
        modLogChannelId: modLogChannelId || null,
        messageLogChannelId: messageLogChannelId || null,
        joinLeaveLogChannelId: joinLeaveLogChannelId || null,
        auditLogChannelId: auditLogChannelId || null,
        voiceLogChannelId: voiceLogChannelId || null,
      });
      toast.success('Logging settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader text="Loading logging settings..." />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-discord-red text-lg font-semibold mb-2">Failed to load logging settings</p>
        <p className="text-discord-muted text-sm mb-4">{error}</p>
        <button onClick={() => setRetryCount((c) => c + 1)} className="px-4 py-2 bg-discord-blurple text-white rounded-lg text-sm hover:bg-discord-blurple/80 transition-colors">Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Logging</h1>
        <p className="text-discord-muted mt-1">Configure where different events are logged</p>
      </div>

      <div className="space-y-6">
        <Card title="General">
          <div className="mt-3">
            <Toggle
              label="Enable Logging"
              description="Master toggle for all server event logging (role/channel/voice changes)"
              enabled={loggingEnabled}
              onChange={(v) => {
                setLoggingEnabled(v);
                if (guildId) configApi.update(guildId, { loggingEnabled: v }).then(
                  () => toast.success(`Logging ${v ? 'enabled' : 'disabled'}`),
                  () => toast.error('Failed to update'),
                );
              }}
            />
          </div>
        </Card>

        <Card title="Log Channels" description="Set channel IDs for each log type. Leave empty to disable.">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
            <Input
              label="Moderation Log Channel"
              placeholder="Bans, kicks, mutes, warnings"
              value={modLogChannelId}
              onChange={(e) => setModLogChannelId(e.target.value)}
            />
            <Input
              label="Message Log Channel"
              placeholder="Message edits & deletions"
              value={messageLogChannelId}
              onChange={(e) => setMessageLogChannelId(e.target.value)}
            />
            <Input
              label="Join/Leave Log Channel"
              placeholder="Member joins & leaves"
              value={joinLeaveLogChannelId}
              onChange={(e) => setJoinLeaveLogChannelId(e.target.value)}
            />
            <Input
              label="Audit Log Channel"
              placeholder="Role/channel/nickname changes"
              value={auditLogChannelId}
              onChange={(e) => setAuditLogChannelId(e.target.value)}
            />
            <Input
              label="Voice Log Channel"
              placeholder="Voice joins, leaves, moves"
              value={voiceLogChannelId}
              onChange={(e) => setVoiceLogChannelId(e.target.value)}
            />
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={save} loading={saving}>Save Changes</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
