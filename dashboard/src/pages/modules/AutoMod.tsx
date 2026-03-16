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

  // Anti-spam
  const [antiSpamThreshold, setAntiSpamThreshold] = useState('');
  const [antiSpamInterval, setAntiSpamInterval] = useState('');

  // Anti-caps
  const [antiCapsThreshold, setAntiCapsThreshold] = useState('');
  const [antiCapsMinLength, setAntiCapsMinLength] = useState('');

  // Blacklist
  const [blacklistedWords, setBlacklistedWords] = useState('');

  // Whitelist (links)
  const [antiLinksWhitelist, setAntiLinksWhitelist] = useState('');

  // Exempt roles / channels
  const [exemptRoleIds, setExemptRoleIds] = useState('');
  const [exemptChannelIds, setExemptChannelIds] = useState('');

  useEffect(() => {
    if (!config) return;
    setAntiSpamThreshold(String(config.antiSpamThreshold ?? 5));
    setAntiSpamInterval(String(config.antiSpamInterval ?? 5));
    setAntiCapsThreshold(String(config.antiCapsThreshold ?? 70));
    setAntiCapsMinLength(String(config.antiCapsMinLength ?? 10));
    setBlacklistedWords((config.blacklistedWords || []).join('\n'));
    setAntiLinksWhitelist((config.antiLinksWhitelist || []).join('\n'));
    setExemptRoleIds((config.automodExemptRoleIds || []).join(', '));
    setExemptChannelIds((config.automodExemptChannelIds || []).join(', '));
  }, [config]);

  if (loading) return <Loader text="Cargando automod..." />;
  if (error) return <div className="text-discord-red text-center py-8">{error}</div>;

  const toggleSetting = async (key: string, value: boolean) => {
    try {
      await updateConfig({ [key]: value });
      toast.success('Ajuste actualizado');
    } catch {
      toast.error('No se pudo actualizar');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await updateConfig({
        antiSpamThreshold: parseInt(antiSpamThreshold) || 5,
        antiSpamInterval: parseInt(antiSpamInterval) || 5,
        antiCapsThreshold: parseInt(antiCapsThreshold) || 70,
        antiCapsMinLength: parseInt(antiCapsMinLength) || 10,
        blacklistedWords: blacklistedWords.split('\n').map((w) => w.trim()).filter(Boolean),
        antiLinksWhitelist: antiLinksWhitelist.split('\n').map((w) => w.trim()).filter(Boolean),
        automodExemptRoleIds: exemptRoleIds.split(',').map((s) => s.trim()).filter(Boolean),
        automodExemptChannelIds: exemptChannelIds.split(',').map((s) => s.trim()).filter(Boolean),
      });
      toast.success('Configuración de AutoMod guardada');
    } catch {
      toast.error('No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">AutoMod</h1>
        <p className="text-discord-muted mt-1">Configura el filtrado automático de mensajes</p>
      </div>

      {/* Toggles */}
      <Card title="Filtros" description="Activa o desactiva filtros individuales" className="mb-6">
        <div className="space-y-4">
          <Toggle
            enabled={config?.antiSpamEnabled ?? false}
            onChange={(v) => toggleSetting('antiSpamEnabled', v)}
            label="Anti-spam"
            description="Elimina mensajes de usuarios que envían demasiado rápido"
          />
          <Toggle
            enabled={config?.antiFloodEnabled ?? false}
            onChange={(v) => toggleSetting('antiFloodEnabled', v)}
            label="Anti-flood"
            description="Activa modo lento cuando hay demasiados mensajes en el canal (anti-flood)"
          />
          <Toggle
            enabled={config?.antiCapsEnabled ?? false}
            onChange={(v) => toggleSetting('antiCapsEnabled', v)}
            label="Anti-mayusculas"
            description="Elimina mensajes con exceso de letras mayúsculas"
          />
          <Toggle
            enabled={config?.antiLinksEnabled ?? false}
            onChange={(v) => toggleSetting('antiLinksEnabled', v)}
            label="Anti-enlaces"
            description="Elimina mensajes que contienen enlaces no permitidos"
          />
          <Toggle
            enabled={config?.blacklistEnabled ?? false}
            onChange={(v) => toggleSetting('blacklistEnabled', v)}
            label="Lista negra de palabras"
            description="Elimina mensajes con palabras de la lista negra"
          />
        </div>
      </Card>

      {/* Anti-Spam Settings */}
      <Card title="Ajustes de anti-spam" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Mensajes máximos"
            type="number"
            placeholder="5"
            value={antiSpamThreshold}
            onChange={(e) => setAntiSpamThreshold(e.target.value)}
          />
          <Input
            label="Intervalo (segundos)"
            type="number"
            placeholder="5"
            value={antiSpamInterval}
            onChange={(e) => setAntiSpamInterval(e.target.value)}
          />
        </div>
        <p className="text-xs text-discord-muted mt-2">
          Usuarios que envíen más de {antiSpamThreshold || 5} mensajes en {antiSpamInterval || 5} segundos serán sancionados.
        </p>
      </Card>

      {/* Anti-Caps Settings */}
      <Card title="Ajustes de anti-mayúsculas" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Umbral de mayúsculas (%)"
            type="number"
            placeholder="70"
            value={antiCapsThreshold}
            onChange={(e) => setAntiCapsThreshold(e.target.value)}
          />
          <Input
            label="Longitud mínima del mensaje"
            type="number"
            placeholder="10"
            value={antiCapsMinLength}
            onChange={(e) => setAntiCapsMinLength(e.target.value)}
          />
        </div>
        <p className="text-xs text-discord-muted mt-2">
          Solo se aplica a mensajes con más de {antiCapsMinLength || 10} caracteres.
        </p>
      </Card>

      {/* Blacklist */}
      <Card title="Palabras en lista negra" description="Una palabra o frase por línea" className="mb-6">
        <Textarea
          placeholder="palabra1&#10;palabra2&#10;frase bloqueada"
          value={blacklistedWords}
          onChange={(e) => setBlacklistedWords(e.target.value)}
          rows={6}
        />
      </Card>

      {/* Anti-Links Whitelist */}
      <Card title="Lista blanca de enlaces" description="Dominios permitidos aunque el anti-enlaces esté activo. Un dominio por línea." className="mb-6">
        <Textarea
          placeholder="discord.gg&#10;youtube.com&#10;twitch.tv"
          value={antiLinksWhitelist}
          onChange={(e) => setAntiLinksWhitelist(e.target.value)}
          rows={5}
        />
      </Card>

      {/* Exempt roles / channels */}
      <Card title="Exclusiones" description="Roles y canales exentos de todas las reglas de AutoMod" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="IDs de roles exentos (separados por coma)"
            placeholder="123456789, 987654321"
            value={exemptRoleIds}
            onChange={(e) => setExemptRoleIds(e.target.value)}
          />
          <Input
            label="IDs de canales exentos (separados por coma)"
            placeholder="123456789, 987654321"
            value={exemptChannelIds}
            onChange={(e) => setExemptChannelIds(e.target.value)}
          />
        </div>
        <p className="text-xs text-discord-muted mt-2">
          Los miembros con rol exento, o en canales exentos, ignoran todas las reglas de AutoMod.
        </p>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving}>
          Guardar configuración de AutoMod
        </Button>
      </div>
    </div>
  );
}
