import { useEffect, useState } from 'react';
import { useGuild } from '@/hooks/useGuild';
import Card from '@/components/Card';
import Toggle from '@/components/Toggle';
import Input, { Select } from '@/components/Input';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import toast from 'react-hot-toast';
import { config as configApi, guilds as guildsApi } from '@/lib/api';
import { Copy } from 'lucide-react';

const CLONE_SECTIONS = [
  { key: 'general',     label: 'General',           desc: 'Prefijo, idioma, rol de silencio' },
  { key: 'welcome',     label: 'Bienvenida',         desc: 'Mensajes de entrada/salida' },
  { key: 'logging',     label: 'Registros',          desc: 'Canales y eventos de log' },
  { key: 'automod',     label: 'AutoMod',            desc: 'Filtros automáticos' },
  { key: 'moderation',  label: 'Moderación',         desc: 'Canal de logs de moderación' },
  { key: 'suggestions', label: 'Sugerencias',        desc: 'Canales de sugerencias' },
  { key: 'reputation',  label: 'Reputación',         desc: 'Canal de reputación' },
];

type ModuleCategory = 'Comunidad' | 'Moderación' | 'Características';

interface ModuleEntry {
  key: string;
  label: string;
  desc: string;
  category: ModuleCategory;
}

const MODULES: ModuleEntry[] = [
  // Comunidad
  { key: 'invites',    label: 'Seguimiento de invitaciones', desc: 'Rastrea quién invitó a quién al servidor',              category: 'Comunidad' },
  { key: 'reputation', label: 'Reputación',                  desc: 'Sistema de puntos de reputación entre miembros',       category: 'Comunidad' },
  { key: 'suggestions',label: 'Sugerencias',                 desc: 'Canal de sugerencias con votación de la comunidad',    category: 'Comunidad' },
  { key: 'giveaway',   label: 'Sorteos',                     desc: 'Crea sorteos con reacciones y selección automática',   category: 'Comunidad' },
  // Moderación
  { key: 'moderation', label: 'Moderación',                  desc: 'Advertir, silenciar, expulsar, banear y más',          category: 'Moderación' },
  { key: 'automod',    label: 'AutoMod',                     desc: 'Filtro automático de spam, mayúsculas, enlaces y palabras', category: 'Moderación' },
  { key: 'logging',    label: 'Registros',                   desc: 'Registra acciones del servidor en canales dedicados',  category: 'Moderación' },
  // Características
  { key: 'welcome',    label: 'Mensajes de bienvenida',      desc: 'Envía un mensaje cuando alguien entra al servidor',    category: 'Características' },
  { key: 'farewell',   label: 'Mensajes de despedida',       desc: 'Envía un mensaje cuando alguien sale del servidor',    category: 'Características' },
  { key: 'tickets',    label: 'Sistema de tickets',          desc: 'Tickets de soporte con paneles y botones',             category: 'Características' },
  { key: 'automation', label: 'Automatización',              desc: 'Autorespuestas, mensajes programados y encuestas',     category: 'Características' },
  { key: 'starboard',  label: 'Starboard',                   desc: 'Destaca los mejores mensajes del servidor',            category: 'Características' },
  { key: 'sticky',     label: 'Mensajes fijos',              desc: 'Mensajes que siempre aparecen al final de un canal',   category: 'Características' },
  { key: 'afk',        label: 'Estado AFK',                  desc: 'Estado de ausencia automático con mención',            category: 'Características' },
  { key: 'backup',     label: 'Copias de seguridad',         desc: 'Crea y restaura copias de seguridad del servidor',     category: 'Características' },
];

const CATEGORIES: ModuleCategory[] = ['Comunidad', 'Moderación', 'Características'];

export default function GeneralConfig() {
  const { guildId, config, loading, error, updateConfig } = useGuild();
  const [saving, setSaving] = useState(false);

  const [prefix, setPrefix] = useState('!');
  const [language, setLanguage] = useState('es');
  const [muteRoleId, setMuteRoleId] = useState('');

  // Clone state
  const [userGuilds, setUserGuilds] = useState<any[]>([]);
  const [cloneTarget, setCloneTarget] = useState('');
  const [cloneSections, setCloneSections] = useState<string[]>([]);
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    guildsApi.list().then((data: any[]) => {
      setUserGuilds(data.filter((g) => g.botPresent && g.id !== guildId));
    }).catch(() => {});
  }, [guildId]);

  useEffect(() => {
    if (!config) return;
    setPrefix(config.prefix || '!');
    setLanguage(config.language || 'es');
    setMuteRoleId(config.muteRoleId || '');
  }, [config]);

  if (loading) return <Loader text="Cargando configuración..." />;
  if (error) return <div className="text-discord-red text-center py-8">{error}</div>;

  const toggleModule = async (moduleKey: string, enabled: boolean) => {
    try {
      await updateConfig({ [`${moduleKey}Enabled`]: enabled });
      toast.success(`Módulo ${enabled ? 'activado' : 'desactivado'}`);
    } catch {
      toast.error('No se pudo actualizar el módulo');
    }
  };

  const cloneConfig = async () => {
    if (!guildId || !cloneTarget || cloneSections.length === 0) return;
    setCloning(true);
    try {
      const res = await configApi.clone(guildId, cloneTarget, cloneSections);
      toast.success(`Configuración clonada (${res.cloned} campos copiados)`);
      setCloneSections([]);
      setCloneTarget('');
    } catch (err: any) {
      toast.error(err.message || 'No se pudo clonar la configuración');
    } finally {
      setCloning(false);
    }
  };

  const saveGeneral = async () => {
    setSaving(true);
    try {
      await updateConfig({
        prefix: prefix.trim() || '!',
        language,
        muteRoleId: muteRoleId.trim() || null,
      });
      toast.success('Configuración guardada');
    } catch {
      toast.error('No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white">Configuración general</h1>
        <p className="text-discord-muted mt-1">Ajustes del bot y activación de módulos para este servidor</p>
      </div>

      {/* Bot settings */}
      <Card title="Ajustes del bot" description="Configuración básica del comportamiento del bot" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Prefijo de comandos de texto"
            placeholder="!"
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
          />
          <Select
            label="Idioma del bot"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            options={[
              { value: 'es', label: 'Español' },
              { value: 'en', label: 'English' },
              { value: 'fr', label: 'Français' },
              { value: 'de', label: 'Deutsch' },
              { value: 'pt', label: 'Português' },
            ]}
          />
        </div>
        <p className="text-xs text-discord-muted mt-2">
          El prefijo se usa para comandos de texto. Los comandos slash (/) funcionan siempre independientemente del prefijo.
        </p>
      </Card>

      {/* Module toggles grouped by category */}
      {CATEGORIES.map((category) => (
        <Card
          key={category}
          title={`Módulos — ${category}`}
          description={`Activa o desactiva los módulos de ${category.toLowerCase()}`}
          className="mb-6"
        >
          <div className="space-y-4">
            {MODULES.filter((m) => m.category === category).map((mod) => (
              <Toggle
                key={mod.key}
                enabled={(config as Record<string, unknown>)?.[`${mod.key}Enabled`] as boolean ?? false}
                onChange={(val) => toggleModule(mod.key, val)}
                label={mod.label}
                description={mod.desc}
              />
            ))}
          </div>
        </Card>
      ))}

      {/* System roles */}
      <Card title="Roles del sistema" description="Roles utilizados internamente por el bot" className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="ID del rol de silencio"
            placeholder="ID del rol (ej. 123456789012345678)"
            value={muteRoleId}
            onChange={(e) => setMuteRoleId(e.target.value)}
          />
        </div>
        <p className="text-xs text-discord-muted mt-2">
          Los roles de entrada automática se configuran en la página de <strong>Bienvenida</strong>.
        </p>
      </Card>

      {/* Clone config */}
      <Card title="Clonar configuración" description="Copia la configuración de este servidor a otro servidor donde tienes el bot" className="mb-6">
        <div className="space-y-4">
          <Select
            label="Servidor destino"
            value={cloneTarget}
            onChange={(e) => setCloneTarget(e.target.value)}
            options={[
              { value: '', label: 'Selecciona un servidor...' },
              ...userGuilds.map((g) => ({ value: g.id, label: g.name })),
            ]}
          />

          {userGuilds.length === 0 && (
            <p className="text-xs text-discord-muted">No hay otros servidores con el bot disponibles.</p>
          )}

          <div>
            <p className="text-sm text-discord-muted mb-2">Secciones a clonar:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CLONE_SECTIONS.map((s) => (
                <label key={s.key} className="flex items-start gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={cloneSections.includes(s.key)}
                    onChange={(e) =>
                      setCloneSections((prev) =>
                        e.target.checked ? [...prev, s.key] : prev.filter((x) => x !== s.key)
                      )
                    }
                    className="mt-0.5 accent-discord-blurple"
                  />
                  <div>
                    <p className="text-sm text-discord-white group-hover:text-discord-blurple transition-colors">{s.label}</p>
                    <p className="text-xs text-discord-muted">{s.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              onClick={cloneConfig}
              loading={cloning}
              disabled={!cloneTarget || cloneSections.length === 0}
              variant="secondary"
            >
              <Copy size={14} className="mr-1" />
              Clonar configuración
            </Button>
            {cloneSections.length > 0 && (
              <span className="text-xs text-discord-muted">{cloneSections.length} sección(es) seleccionada(s)</span>
            )}
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveGeneral} loading={saving}>
          Guardar configuración
        </Button>
      </div>
    </div>
  );
}
