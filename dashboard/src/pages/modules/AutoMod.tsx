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
        antiSpamMaxMessages: parseInt(antiSpamMax) || 5,
        antiSpamInterval: parseInt(antiSpamInterval) || 5,
        antiCapsPercent: parseInt(antiCapsPercent) || 70,
        antiCapsMinLength: parseInt(antiCapsMinLength) || 10,
        blacklistWords: blacklistWords
          .split('\n')
          .map((w) => w.trim())
          .filter(Boolean),
      });
      toast.success('Configuracion de AutoMod guardada');
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
        <p className="text-discord-muted mt-1">Configura el filtrado automatico de mensajes</p>
      </div>

      {/* Toggles */}
      <Card title="Filtros" description="Activa o desactiva filtros individuales" className="mb-6">
        <div className="space-y-4">
          <Toggle
            enabled={config?.antiSpamEnabled ?? false}
            onChange={(v) => toggleSetting('antiSpamEnabled', v)}
             label="Anti-spam"
             description="Elimina mensajes de usuarios que envian demasiado rapido"
          />
          <Toggle
            enabled={config?.antiCapsEnabled ?? false}
            onChange={(v) => toggleSetting('antiCapsEnabled', v)}
             label="Anti-mayusculas"
             description="Elimina mensajes con exceso de letras mayusculas"
          />
          <Toggle
            enabled={config?.antiLinksEnabled ?? false}
            onChange={(v) => toggleSetting('antiLinksEnabled', v)}
             label="Anti-enlaces"
             description="Elimina mensajes que contienen URLs"
          />
          <Toggle
            enabled={config?.blacklistEnabled ?? false}
            onChange={(v) => toggleSetting('blacklistEnabled', v)}
             label="Lista negra de palabras"
             description="Elimina mensajes con palabras en lista negra"
          />
        </div>
      </Card>

      {/* Anti-Spam Settings */}
      <Card title="Ajustes de anti-spam" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Mensajes maximos"
            type="number"
            placeholder="5"
            value={antiSpamMax}
            onChange={(e) => setAntiSpamMax(e.target.value)}
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
          Usuarios que envien mas de {antiSpamMax || 5} mensajes dentro de {antiSpamInterval || 5} segundos seran marcados.
        </p>
      </Card>

      {/* Anti-Caps Settings */}
      <Card title="Ajustes de anti-mayusculas" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Umbral de porcentaje en mayusculas"
            type="number"
            placeholder="70"
            value={antiCapsPercent}
            onChange={(e) => setAntiCapsPercent(e.target.value)}
          />
          <Input
            label="Longitud minima del mensaje"
            type="number"
            placeholder="10"
            value={antiCapsMinLength}
            onChange={(e) => setAntiCapsMinLength(e.target.value)}
          />
        </div>
      </Card>

      {/* Blacklist */}
      <Card title="Palabras en lista negra" description="Una palabra por linea" className="mb-6">
        <Textarea
          placeholder="badword1&#10;badword2&#10;phrase to block"
          value={blacklistWords}
          onChange={(e) => setBlacklistWords(e.target.value)}
          rows={6}
        />
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} loading={saving}>
          Guardar configuracion de AutoMod
        </Button>
      </div>
    </div>
  );
}
