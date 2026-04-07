import { useEffect, useState } from 'react';
import { useGuild } from '@/hooks/useGuild';
import { guilds as guildsApi } from '@/lib/api';
import Card from '@/components/Card';
import Toggle from '@/components/Toggle';
import Input from '@/components/Input';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import TagInput from '@/components/TagInput';
import RoleMultiSelect from '@/components/RoleMultiSelect';
import toast from 'react-hot-toast';
import { X, Plus } from 'lucide-react';

// Inline ChannelMultiSelect for automod exempt channels
function ChannelMultiSelect({
  label,
  description,
  channels,
  selected,
  onChange,
}: {
  label?: string;
  description?: string;
  channels: { id: string; name: string; type: number; parentId: string | null }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [adding, setAdding] = useState('');
  const textChannels = channels.filter(c => c.type === 0 || c.type === 5);
  const selectedChannels = selected.map(id => channels.find(c => c.id === id) || { id, name: id, type: 0, parentId: null });
  const available = textChannels.filter(c => !selected.includes(c.id));

  const add = (id: string) => { if (id && !selected.includes(id)) onChange([...selected, id]); setAdding(''); };
  const remove = (id: string) => onChange(selected.filter(c => c !== id));

  return (
    <div>
      {label && <p className="block text-sm font-medium text-discord-muted mb-1.5">{label}</p>}
      {selectedChannels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedChannels.map(c => (
            <span key={c.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-discord-blurple/10 text-discord-blurple border border-discord-blurple/30">
              #{c.name}
              <button onClick={() => remove(c.id)} className="ml-1 hover:text-discord-red transition-colors"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      {available.length > 0 ? (
        <div className="flex gap-2">
          <select value={adding} onChange={e => setAdding(e.target.value)}
            className="flex-1 bg-discord-darker border border-discord-lighter/30 rounded-md px-3 py-2 text-sm text-discord-white focus:outline-none focus:border-discord-blurple">
            <option value="">Seleccionar canal para agregar...</option>
            {available.map(c => <option key={c.id} value={c.id}>#{c.name}</option>)}
          </select>
          <button onClick={() => add(adding)} disabled={!adding}
            className="px-3 py-2 rounded-md bg-discord-blurple text-white text-sm font-medium disabled:opacity-40 hover:bg-discord-blurple/80 transition-colors">
            <Plus size={14} />
          </button>
        </div>
      ) : (
        <p className="text-xs text-discord-muted italic">No hay más canales disponibles</p>
      )}
      {description && <p className="text-xs text-discord-muted mt-1">{description}</p>}
    </div>
  );
}

export default function AutoMod() {
  const { guildId, config, loading, error, updateConfig } = useGuild();
  const [saving, setSaving] = useState(false);

  const [guildRoles, setGuildRoles] = useState<{ id: string; name: string; color: number }[]>([]);
  const [guildChannels, setGuildChannels] = useState<{ id: string; name: string; type: number; parentId: string | null }[]>([]);

  // Anti-spam
  const [antiSpamThreshold, setAntiSpamThreshold] = useState('');
  const [antiSpamInterval, setAntiSpamInterval] = useState('');

  // Anti-caps
  const [antiCapsThreshold, setAntiCapsThreshold] = useState('');
  const [antiCapsMinLength, setAntiCapsMinLength] = useState('');

  // Blacklist
  const [blacklistedWords, setBlacklistedWords] = useState<string[]>([]);

  // Whitelist (links)
  const [antiLinksWhitelist, setAntiLinksWhitelist] = useState<string[]>([]);

  // Exempt roles / channels
  const [exemptRoleIds, setExemptRoleIds] = useState<string[]>([]);
  const [exemptChannelIds, setExemptChannelIds] = useState<string[]>([]);

  useEffect(() => {
    if (!config) return;
    setAntiSpamThreshold(String(config.antiSpamThreshold ?? 5));
    setAntiSpamInterval(String(config.antiSpamInterval ?? 5));
    setAntiCapsThreshold(String(config.antiCapsThreshold ?? 70));
    setAntiCapsMinLength(String(config.antiCapsMinLength ?? 10));
    setBlacklistedWords(config.blacklistedWords || []);
    setAntiLinksWhitelist(config.antiLinksWhitelist || []);
    setExemptRoleIds(config.automodExemptRoleIds || []);
    setExemptChannelIds(config.automodExemptChannelIds || []);
  }, [config]);

  useEffect(() => {
    if (!guildId) return;
    Promise.all([
      guildsApi.roles(guildId).catch(() => []),
      guildsApi.channels(guildId).catch(() => []),
    ]).then(([roles, channels]) => {
      setGuildRoles(roles);
      setGuildChannels(channels);
    });
  }, [guildId]);

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
        blacklistedWords,
        antiLinksWhitelist,
        automodExemptRoleIds: exemptRoleIds,
        automodExemptChannelIds: exemptChannelIds,
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
      <Card title="Palabras en lista negra" description="Palabras o frases bloqueadas. Presiona Enter o coma para agregar." className="mb-6">
        <TagInput
          tags={blacklistedWords}
          onChange={setBlacklistedWords}
          placeholder="Escribe una palabra y presiona Enter..."
          description="Los mensajes que contengan estas palabras serán eliminados automáticamente"
        />
      </Card>

      {/* Anti-Links Whitelist */}
      <Card title="Lista blanca de enlaces" description="Dominios permitidos aunque el anti-enlaces esté activo." className="mb-6">
        <TagInput
          tags={antiLinksWhitelist}
          onChange={setAntiLinksWhitelist}
          placeholder="discord.gg, youtube.com..."
          description="Los enlaces a estos dominios no serán eliminados"
        />
      </Card>

      {/* Exempt roles / channels */}
      <Card title="Exclusiones" description="Roles y canales exentos de todas las reglas de AutoMod" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RoleMultiSelect
            label="Roles exentos"
            description="Los miembros con estos roles ignoran todas las reglas de AutoMod"
            roles={guildRoles}
            selected={exemptRoleIds}
            onChange={setExemptRoleIds}
          />
          <ChannelMultiSelect
            label="Canales exentos"
            description="Las reglas de AutoMod no se aplican en estos canales"
            channels={guildChannels}
            selected={exemptChannelIds}
            onChange={setExemptChannelIds}
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving}>
          Guardar configuración de AutoMod
        </Button>
      </div>
    </div>
  );
}
