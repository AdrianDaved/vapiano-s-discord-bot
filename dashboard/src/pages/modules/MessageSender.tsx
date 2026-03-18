import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { guilds as guildsApi, messages as messagesApi } from '@/lib/api';
import Card from '@/components/Card';
import Input, { Textarea, Select } from '@/components/Input';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import toast from 'react-hot-toast';
import { Send, Eye, Plus, Trash2, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
}

interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

interface EmbedData {
  title: string;
  titleUrl: string;
  description: string;
  color: string;
  authorName: string;
  authorIconUrl: string;
  footerText: string;
  footerIconUrl: string;
  imageUrl: string;
  thumbnailUrl: string;
  timestamp: boolean;
  fields: EmbedField[];
}

const EMPTY_EMBED: EmbedData = {
  title: '',
  titleUrl: '',
  description: '',
  color: '#5865F2',
  authorName: '',
  authorIconUrl: '',
  footerText: '',
  footerIconUrl: '',
  imageUrl: '',
  thumbnailUrl: '',
  timestamp: false,
  fields: [],
};

const PRESET_COLORS = [
  { name: 'Blurple', value: '#5865F2' },
  { name: 'Verde', value: '#57F287' },
  { name: 'Rojo', value: '#ED4245' },
  { name: 'Amarillo', value: '#FEE75C' },
  { name: 'Fucsia', value: '#EB459E' },
  { name: 'Blanco', value: '#FFFFFF' },
  { name: 'Negro', value: '#23272A' },
];

const LIMITS = {
  title: 256,
  description: 4096,
  authorName: 256,
  footerText: 2048,
  fieldName: 256,
  fieldValue: 1024,
  content: 2000,
};

function CharCount({ current, max }: { current: number; max: number }) {
  const ratio = current / max;
  const color = ratio >= 1 ? 'text-discord-red' : ratio >= 0.85 ? 'text-discord-yellow' : 'text-discord-muted';
  return <span className={`text-xs ${color}`}>{current}/{max}</span>;
}

export default function MessageSender() {
  const { guildId } = useParams();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);

  // Form state
  const [channelId, setChannelId] = useState('');
  const [tab, setTab] = useState<'text' | 'embed' | 'both'>('embed');
  const [plainText, setPlainText] = useState('');
  const [embed, setEmbed] = useState<EmbedData>({ ...EMPTY_EMBED });
  const [extraContent, setExtraContent] = useState('');
  const [sending, setSending] = useState(false);

  // Collapsible sections
  const [sections, setSections] = useState({
    author: false,
    body: true,
    media: false,
    fields: false,
    footer: false,
  });

  const toggleSection = (key: keyof typeof sections) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Load channels
  useEffect(() => {
    if (!guildId) return;
    setLoadingChannels(true);
    guildsApi.channels(guildId)
      .then((data: Channel[]) => setChannels(data))
      .catch(() => toast.error('No se pudieron cargar los canales'))
      .finally(() => setLoadingChannels(false));
  }, [guildId]);

  const textChannels = channels.filter((c) => c.type === 0 || c.type === 5);

  const updateEmbed = <K extends keyof EmbedData>(key: K, value: EmbedData[K]) => {
    setEmbed((prev) => ({ ...prev, [key]: value }));
  };

  const addField = () => {
    if (embed.fields.length >= 25) {
      toast.error('Máximo 25 campos por embed');
      return;
    }
    updateEmbed('fields', [...embed.fields, { name: '', value: '', inline: false }]);
    if (!sections.fields) setSections((s) => ({ ...s, fields: true }));
  };

  const updateField = (index: number, updated: EmbedField) => {
    const next = [...embed.fields];
    next[index] = updated;
    updateEmbed('fields', next);
  };

  const removeField = (index: number) => {
    updateEmbed('fields', embed.fields.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setPlainText('');
    setEmbed({ ...EMPTY_EMBED });
    setExtraContent('');
    toast.success('Formulario limpiado');
  };

  const canSend = !!channelId && (
    tab === 'text'
      ? !!plainText.trim()
      : tab === 'embed'
        ? !!(embed.description.trim() || embed.title.trim() || embed.fields.length > 0 || embed.imageUrl.trim())
        : !!(plainText.trim() || embed.description.trim() || embed.title.trim())
  );

  const handleSend = async () => {
    if (!guildId || !canSend) return;
    setSending(true);
    try {
      const body: Record<string, any> = { channelId };

      if (tab === 'text') {
        body.content = plainText;
      } else if (tab === 'embed') {
        body.embed = buildEmbedPayload();
        if (extraContent.trim()) body.content = extraContent;
      } else {
        // both
        if (plainText.trim()) body.content = plainText;
        body.embed = buildEmbedPayload();
      }

      await messagesApi.send(guildId, body);
      toast.success('¡Mensaje enviado correctamente!');

      // Reset
      setPlainText('');
      setEmbed({ ...EMPTY_EMBED });
      setExtraContent('');
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const buildEmbedPayload = () => {
    const payload: Record<string, any> = {
      color: embed.color,
    };
    if (embed.title) payload.title = embed.title;
    if (embed.titleUrl) payload.titleUrl = embed.titleUrl;
    if (embed.description) payload.description = embed.description;
    if (embed.authorName) payload.authorName = embed.authorName;
    if (embed.authorIconUrl) payload.authorIconUrl = embed.authorIconUrl;
    if (embed.footerText) payload.footerText = embed.footerText;
    if (embed.footerIconUrl) payload.footerIconUrl = embed.footerIconUrl;
    if (embed.imageUrl) payload.imageUrl = embed.imageUrl;
    if (embed.thumbnailUrl) payload.thumbnailUrl = embed.thumbnailUrl;
    if (embed.timestamp) payload.timestamp = true;
    if (embed.fields.length > 0) {
      payload.fields = embed.fields.filter((f) => f.name.trim() && f.value.trim());
    }
    return payload;
  };

  const embedColorHex = embed.color || '#5865F2';

  const hasEmbedContent = embed.title || embed.description || embed.authorName ||
    embed.footerText || embed.imageUrl || embed.thumbnailUrl || embed.fields.length > 0;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-discord-white flex items-center gap-3">
            <Send size={24} className="text-discord-blurple" />
            Enviar mensaje
          </h1>
          <p className="text-discord-muted mt-1">Envía mensajes de texto o embeds completos a cualquier canal del servidor</p>
        </div>
        <button
          onClick={resetForm}
          className="flex items-center gap-2 px-3 py-2 text-sm text-discord-muted hover:text-discord-white bg-discord-darker rounded-lg transition-colors"
        >
          <RotateCcw size={14} />
          Limpiar
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ─── Builder form ─── */}
        <div className="space-y-4">
          <Card title="Configuración del mensaje">
            <div className="space-y-4 mt-3">
              {/* Channel selector */}
              {loadingChannels ? (
                <div className="flex items-center gap-2 text-discord-muted text-sm">
                  <Loader />
                  <span>Cargando canales...</span>
                </div>
              ) : (
                <Select
                  label="Canal de destino"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  options={[
                    { value: '', label: 'Seleccionar canal...' },
                    ...textChannels.map((c) => ({ value: c.id, label: `#${c.name}` })),
                  ]}
                />
              )}

              {/* Tab toggle - 3 modes */}
              <div>
                <p className="text-sm font-medium text-discord-muted mb-2">Tipo de mensaje</p>
                <div className="flex rounded-lg overflow-hidden border border-discord-lighter">
                  {(['text', 'embed', 'both'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`flex-1 py-2 text-sm font-medium transition-colors ${
                        tab === t
                          ? 'bg-discord-blurple text-white'
                          : 'bg-discord-darker text-discord-muted hover:text-discord-white'
                      }`}
                    >
                      {t === 'text' ? 'Texto' : t === 'embed' ? 'Embed' : 'Texto + Embed'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text content (for text and both modes) */}
              {(tab === 'text' || tab === 'both') && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-discord-muted">Contenido del mensaje</label>
                    <CharCount current={plainText.length} max={LIMITS.content} />
                  </div>
                  <Textarea
                    placeholder="Escribe tu mensaje aquí (soporta markdown de Discord)..."
                    value={plainText}
                    onChange={(e) => setPlainText(e.target.value)}
                    className="min-h-[120px]"
                  />
                </div>
              )}

              {/* Extra content above embed (embed mode only) */}
              {tab === 'embed' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-discord-muted">Texto adicional (opcional, fuera del embed)</label>
                    <CharCount current={extraContent.length} max={LIMITS.content} />
                  </div>
                  <Textarea
                    placeholder="Texto que aparecerá fuera del embed..."
                    value={extraContent}
                    onChange={(e) => setExtraContent(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Embed builder (for embed and both modes) */}
          {(tab === 'embed' || tab === 'both') && (
            <Card title="Constructor de Embed">
              <div className="space-y-1 mt-3 divide-y divide-discord-lighter/30">
                {/* Color */}
                <div className="pb-3">
                  <p className="text-sm font-medium text-discord-muted mb-2">Color del embed</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c.value}
                        title={c.name}
                        onClick={() => updateEmbed('color', c.value)}
                        className={`w-7 h-7 rounded-full border-2 transition-all ${
                          embed.color.toUpperCase() === c.value.toUpperCase()
                            ? 'border-white scale-110'
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={embed.color}
                      onChange={(e) => updateEmbed('color', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                    <Input
                      placeholder="#5865F2"
                      value={embed.color}
                      onChange={(e) => updateEmbed('color', e.target.value)}
                    />
                  </div>
                </div>

                {/* Author section */}
                <div className="py-3">
                  <button onClick={() => toggleSection('author')} className="flex items-center justify-between w-full text-sm font-medium text-discord-muted hover:text-discord-white transition-colors">
                    <span>👤 Autor</span>
                    {sections.author ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {sections.author && (
                    <div className="space-y-3 mt-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-discord-muted">Nombre del autor</label>
                          <CharCount current={embed.authorName.length} max={LIMITS.authorName} />
                        </div>
                        <Input placeholder="Nombre del autor" value={embed.authorName} onChange={(e) => updateEmbed('authorName', e.target.value)} />
                      </div>
                      <Input label="URL del icono del autor" placeholder="https://..." value={embed.authorIconUrl} onChange={(e) => updateEmbed('authorIconUrl', e.target.value)} />
                    </div>
                  )}
                </div>

                {/* Title & Description */}
                <div className="py-3">
                  <button onClick={() => toggleSection('body')} className="flex items-center justify-between w-full text-sm font-medium text-discord-muted hover:text-discord-white transition-colors">
                    <span>📝 Título y Descripción</span>
                    {sections.body ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {sections.body && (
                    <div className="space-y-3 mt-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-discord-muted">Título</label>
                          <CharCount current={embed.title.length} max={LIMITS.title} />
                        </div>
                        <Input placeholder="Título del embed" value={embed.title} onChange={(e) => updateEmbed('title', e.target.value)} />
                      </div>
                      <Input label="URL del título (hace el título clickeable)" placeholder="https://..." value={embed.titleUrl} onChange={(e) => updateEmbed('titleUrl', e.target.value)} />
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-discord-muted">Descripción</label>
                          <CharCount current={embed.description.length} max={LIMITS.description} />
                        </div>
                        <Textarea placeholder="Contenido principal del embed (soporta markdown)..." value={embed.description} onChange={(e) => updateEmbed('description', e.target.value)} className="min-h-[100px]" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Media */}
                <div className="py-3">
                  <button onClick={() => toggleSection('media')} className="flex items-center justify-between w-full text-sm font-medium text-discord-muted hover:text-discord-white transition-colors">
                    <span>🖼️ Imágenes y GIFs</span>
                    {sections.media ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {sections.media && (
                    <div className="space-y-3 mt-3">
                      <Input label="URL de imagen / GIF (grande)" placeholder="https://media.giphy.com/... o cualquier URL de imagen" value={embed.imageUrl} onChange={(e) => updateEmbed('imageUrl', e.target.value)} />
                      <Input label="URL de miniatura (esquina superior derecha)" placeholder="https://..." value={embed.thumbnailUrl} onChange={(e) => updateEmbed('thumbnailUrl', e.target.value)} />
                      <p className="text-xs text-discord-muted">Soporta PNG, JPG, GIF y WebP. Los GIFs animados se mostrarán con animación.</p>
                    </div>
                  )}
                </div>

                {/* Fields */}
                <div className="py-3">
                  <button onClick={() => toggleSection('fields')} className="flex items-center justify-between w-full text-sm font-medium text-discord-muted hover:text-discord-white transition-colors">
                    <span>📋 Campos ({embed.fields.length}/25)</span>
                    {sections.fields ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {sections.fields && (
                    <div className="space-y-3 mt-3">
                      {embed.fields.map((field, i) => (
                        <div key={i} className="bg-discord-darker/50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-discord-muted font-medium">Campo {i + 1}</span>
                            <button onClick={() => removeField(i)} className="text-discord-red hover:text-red-300 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs text-discord-muted">Nombre</label>
                              <CharCount current={field.name.length} max={LIMITS.fieldName} />
                            </div>
                            <Input placeholder="Nombre del campo" value={field.name} onChange={(e) => updateField(i, { ...field, name: e.target.value })} />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-xs text-discord-muted">Valor</label>
                              <CharCount current={field.value.length} max={LIMITS.fieldValue} />
                            </div>
                            <Textarea placeholder="Valor del campo" value={field.value} onChange={(e) => updateField(i, { ...field, value: e.target.value })} className="min-h-[60px]" />
                          </div>
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-discord-muted">
                            <input
                              type="checkbox"
                              checked={field.inline}
                              onChange={(e) => updateField(i, { ...field, inline: e.target.checked })}
                              className="rounded border-discord-lighter bg-discord-darker text-discord-blurple"
                            />
                            En línea (mostrar lado a lado)
                          </label>
                        </div>
                      ))}
                      {embed.fields.length < 25 && (
                        <button
                          onClick={addField}
                          className="w-full py-2 border border-dashed border-discord-lighter rounded-lg text-sm text-discord-muted hover:text-discord-blurple hover:border-discord-blurple transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus size={14} />
                          Agregar campo
                        </button>
                      )}
                      {embed.fields.length === 0 && (
                        <p className="text-xs text-discord-muted text-center py-1">Los campos aparecen como bloques de información dentro del embed.</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="py-3">
                  <button onClick={() => toggleSection('footer')} className="flex items-center justify-between w-full text-sm font-medium text-discord-muted hover:text-discord-white transition-colors">
                    <span>🔻 Pie de página</span>
                    {sections.footer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {sections.footer && (
                    <div className="space-y-3 mt-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-discord-muted">Texto del pie</label>
                          <CharCount current={embed.footerText.length} max={LIMITS.footerText} />
                        </div>
                        <Input placeholder="Texto del footer" value={embed.footerText} onChange={(e) => updateEmbed('footerText', e.target.value)} />
                      </div>
                      <Input label="URL del icono del footer" placeholder="https://..." value={embed.footerIconUrl} onChange={(e) => updateEmbed('footerIconUrl', e.target.value)} />
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-discord-muted">
                        <input
                          type="checkbox"
                          checked={embed.timestamp}
                          onChange={(e) => updateEmbed('timestamp', e.target.checked)}
                          className="rounded border-discord-lighter bg-discord-darker text-discord-blurple"
                        />
                        🕐 Incluir marca de tiempo
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Send button */}
          <div className="flex justify-end">
            <Button onClick={handleSend} loading={sending} disabled={!canSend}>
              <Send size={16} />
              Enviar mensaje
            </Button>
          </div>
        </div>

        {/* ─── Live preview ─── */}
        <div className="xl:sticky xl:top-6 self-start">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Eye size={18} className="text-discord-blurple" />
              <h3 className="text-lg font-semibold text-discord-white">Vista previa</h3>
            </div>

            <div className="bg-discord-darker rounded-xl p-4 min-h-[200px]">
              {!plainText.trim() && !hasEmbedContent && !extraContent.trim() ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-discord-muted text-sm italic">
                    El mensaje aparecerá aquí mientras escribes...
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Bot header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">B</div>
                    <span className="text-discord-white font-semibold text-sm">Vapiano Bot</span>
                    <span className="text-[10px] bg-discord-blurple text-white px-1 py-0.5 rounded text-center leading-none">BOT</span>
                  </div>

                  {/* Plain text */}
                  {(tab === 'text' || tab === 'both') && plainText.trim() && (
                    <div className="ml-10">
                      <p className="text-discord-white text-sm whitespace-pre-wrap break-words">{plainText}</p>
                    </div>
                  )}

                  {/* Extra content (embed mode) */}
                  {tab === 'embed' && extraContent.trim() && (
                    <div className="ml-10">
                      <p className="text-discord-white text-sm whitespace-pre-wrap break-words mb-2">{extraContent}</p>
                    </div>
                  )}

                  {/* Embed preview */}
                  {(tab === 'embed' || tab === 'both') && hasEmbedContent && (
                    <div className="ml-10">
                      <div className="rounded-r-lg rounded-bl-lg overflow-hidden" style={{ borderLeft: `4px solid ${embedColorHex}` }}>
                        <div className="bg-[#2f3136] p-3">
                          <div className="flex justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-1">
                              {/* Author */}
                              {embed.authorName && (
                                <div className="flex items-center gap-1.5">
                                  {embed.authorIconUrl && (
                                    <img src={embed.authorIconUrl} alt="" className="w-5 h-5 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                  )}
                                  <p className="text-discord-white text-xs font-semibold">{embed.authorName}</p>
                                </div>
                              )}
                              {/* Title */}
                              {embed.title && (
                                embed.titleUrl ? (
                                  <a href={embed.titleUrl} target="_blank" rel="noopener noreferrer" className="text-[#00aff4] font-bold text-sm hover:underline block">{embed.title}</a>
                                ) : (
                                  <p className="text-discord-white font-bold text-sm">{embed.title}</p>
                                )
                              )}
                              {/* Description */}
                              {embed.description && (
                                <p className="text-[#dcddde] text-sm whitespace-pre-wrap break-words">{embed.description}</p>
                              )}
                              {/* Fields */}
                              {embed.fields.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {renderFieldGroups(embed.fields)}
                                </div>
                              )}
                              {/* Image */}
                              {embed.imageUrl && (
                                <img src={embed.imageUrl} alt="embed image" className="mt-2 max-w-full rounded-lg max-h-48 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              )}
                              {/* Footer */}
                              {(embed.footerText || embed.timestamp) && (
                                <div className="flex items-center gap-1.5 mt-2 pt-1 border-t border-[#40444b]">
                                  {embed.footerIconUrl && (
                                    <img src={embed.footerIconUrl} alt="" className="w-4 h-4 rounded-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                  )}
                                  <p className="text-[#a3a6aa] text-xs">
                                    {embed.footerText}
                                    {embed.footerText && embed.timestamp && ' • '}
                                    {embed.timestamp && new Date().toLocaleString()}
                                  </p>
                                </div>
                              )}
                            </div>
                            {/* Thumbnail */}
                            {embed.thumbnailUrl && (
                              <img src={embed.thumbnailUrl} alt="thumbnail" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Character limits reference */}
            <div className="mt-4 pt-3 border-t border-discord-lighter/30">
              <p className="text-xs font-semibold text-discord-muted mb-2 uppercase tracking-wider">Límites de caracteres</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-discord-muted">
                <div className="flex justify-between"><span>Contenido</span><span className="opacity-50">{LIMITS.content}</span></div>
                <div className="flex justify-between"><span>Título</span><span className="opacity-50">{LIMITS.title}</span></div>
                <div className="flex justify-between"><span>Descripción</span><span className="opacity-50">{LIMITS.description}</span></div>
                <div className="flex justify-between"><span>Autor</span><span className="opacity-50">{LIMITS.authorName}</span></div>
                <div className="flex justify-between"><span>Pie de página</span><span className="opacity-50">{LIMITS.footerText}</span></div>
                <div className="flex justify-between"><span>Campo nombre</span><span className="opacity-50">{LIMITS.fieldName}</span></div>
                <div className="flex justify-between"><span>Campo valor</span><span className="opacity-50">{LIMITS.fieldValue}</span></div>
                <div className="flex justify-between"><span>Máx. campos</span><span className="opacity-50">25</span></div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Render embed fields grouped by inline status */
function renderFieldGroups(fields: EmbedField[]) {
  const groups: (EmbedField | null)[][] = [];
  let row: (EmbedField | null)[] = [];

  for (const f of fields) {
    if (!f.name.trim() && !f.value.trim()) continue;
    if (!f.inline) {
      if (row.length > 0) groups.push(row);
      groups.push([f]);
      row = [];
    } else {
      row.push(f);
      if (row.length === 3) {
        groups.push(row);
        row = [];
      }
    }
  }
  if (row.length > 0) groups.push(row);

  return groups.map((group, gi) => (
    <div
      key={gi}
      className={group.length > 1 ? 'grid gap-2' : ''}
      style={group.length > 1 ? { gridTemplateColumns: `repeat(${group.length}, 1fr)` } : {}}
    >
      {group.map((f, fi) => f && (
        <div key={fi}>
          <p className="text-xs font-semibold text-discord-white">{f.name}</p>
          <p className="text-xs text-[#dcddde] whitespace-pre-wrap">{f.value}</p>
        </div>
      ))}
    </div>
  ));
}
