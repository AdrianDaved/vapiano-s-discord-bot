import { useEffect, useState } from 'react';
import { useGuild } from '@/hooks/useGuild';
import Card from '@/components/Card';
import Toggle from '@/components/Toggle';
import Input from '@/components/Input';
import { Textarea } from '@/components/Input';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import toast from 'react-hot-toast';

export default function AutoMod() {
  const { config, loading, error, updateConfig } = useGuild();
  const [saving, setSaving] = useState(false);

  // Local state
  const [antiSpamMax, setAntiSpamMax] = useState('');
  const [antiSpamInterval, setAntiSpamInterval] = useState('');
  const [antiCapsPercent, setAntiCapsPercent] = useState('');
  const [antiCapsMinLength, setAntiCapsMinLength] = useState('');
  const [blacklistWords, setBlacklistWords] = useState('');

  // Sync local state from config whenever config changes (including guild switch)
  useEffect(() => {
    if (!config) return;
    setAntiSpamMax(String(config.antiSpamMaxMessages ?? 5));
    setAntiSpamInterval(String(config.antiSpamInterval ?? 5));
    setAntiCapsPercent(String(config.antiCapsPercent ?? 70));
    setAntiCapsMinLength(String(config.antiCapsMinLength ?? 10));
    setBlacklistWords((config.blacklistWords || []).join('\n'));
  }, [config]);

  if (loading) return <Loader text="Loading automod..." />;
  if (error) return <div className="text-discord-red text-center py-8">{error}</div>;

  const toggleSetting = async (key: string, value: boolean) => {
    try {
      await updateConfig({ [key]: value });
      toast.success('Setting updated');
    } catch {
      toast.error('Failed to update');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateConfig({
        antiSpamMaxMessages: parseInt(antiSpamMax) || 5,
        antiSpamInterval: parseInt(antiSpamInterval) || 5,
        antiCapsPercent: parseInt(antiCapsPercent) || 70,
        antiCapsMinLength: parseInt(antiCapsMinLength) || 10,
        blacklistWords: blacklistWords
          .split('\n')
          .map((w) => w.trim())
          .filter(Boolean),
      });
      toast.success('AutoMod settings saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">AutoMod</h1>
        <p className="text-discord-muted mt-1">Configure automatic message filtering</p>
      </div>

      {/* Toggles */}
      <Card title="Filters" description="Enable or disable individual filters" className="mb-6">
        <div className="space-y-4">
          <Toggle
            enabled={config?.antiSpamEnabled ?? false}
            onChange={(v) => toggleSetting('antiSpamEnabled', v)}
            label="Anti-Spam"
            description="Delete messages from users sending too fast"
          />
          <Toggle
            enabled={config?.antiCapsEnabled ?? false}
            onChange={(v) => toggleSetting('antiCapsEnabled', v)}
            label="Anti-Caps"
            description="Delete messages with excessive capital letters"
          />
          <Toggle
            enabled={config?.antiLinksEnabled ?? false}
            onChange={(v) => toggleSetting('antiLinksEnabled', v)}
            label="Anti-Links"
            description="Delete messages containing URLs"
          />
          <Toggle
            enabled={config?.blacklistEnabled ?? false}
            onChange={(v) => toggleSetting('blacklistEnabled', v)}
            label="Word Blacklist"
            description="Delete messages containing blacklisted words"
          />
        </div>
      </Card>

      {/* Anti-Spam Settings */}
      <Card title="Anti-Spam Settings" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Max Messages"
            type="number"
            placeholder="5"
            value={antiSpamMax}
            onChange={(e) => setAntiSpamMax(e.target.value)}
          />
          <Input
            label="Interval (seconds)"
            type="number"
            placeholder="5"
            value={antiSpamInterval}
            onChange={(e) => setAntiSpamInterval(e.target.value)}
          />
        </div>
        <p className="text-xs text-discord-muted mt-2">
          Users sending more than {antiSpamMax || 5} messages within {antiSpamInterval || 5} seconds will be flagged.
        </p>
      </Card>

      {/* Anti-Caps Settings */}
      <Card title="Anti-Caps Settings" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Caps Percentage Threshold"
            type="number"
            placeholder="70"
            value={antiCapsPercent}
            onChange={(e) => setAntiCapsPercent(e.target.value)}
          />
          <Input
            label="Minimum Message Length"
            type="number"
            placeholder="10"
            value={antiCapsMinLength}
            onChange={(e) => setAntiCapsMinLength(e.target.value)}
          />
        </div>
      </Card>

      {/* Blacklist */}
      <Card title="Blacklisted Words" description="One word per line" className="mb-6">
        <Textarea
          placeholder="badword1&#10;badword2&#10;phrase to block"
          value={blacklistWords}
          onChange={(e) => setBlacklistWords(e.target.value)}
          rows={6}
        />
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving}>
          Save AutoMod Settings
        </Button>
      </div>
    </div>
  );
}
