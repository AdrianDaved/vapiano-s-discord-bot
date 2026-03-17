import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { guilds as guildsApi, messages as messagesApi } from '@/lib/api';
import Card from '@/components/Card';
import Input, { Textarea, Select } from '@/components/Input';
import Button from '@/components/Button';
import Loader from '@/components/Loader';
import toast from 'react-hot-toast';
import { Send, Eye } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
}

interface EmbedData {
  title: string;
  description: string;
  color: string;
  author: string;
  footer: string;
  image: string;
  thumbnail: string;
}

export default function MessageSender() {
  const { guildId } = useParams();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);

  // Form state
  const [channelId, setChannelId] = useState('');
  const [tab, setTab] = useState<'text' | 'embed'>('text');
  const [plainText, setPlainText] = useState('');
  const [embed, setEmbed] = useState<EmbedData>({
    title: '',
    description: '',
    color: '#5865F2',
    author: '',
    footer: '',
    image: '',
    thumbnail: '',
  });
  const [extraContent, setExtraContent] = useState('');

  const [sending, setSending] = useState(false);

  // Load channels once
  useEffect(() => {
    if (!guildId) return;
    setLoadingChannels(true);
    guildsApi.channels(guildId)
      .then((data: Channel[]) => setChannels(data))
      .catch(() => toast.error('No se pudieron cargar los canales'))
      .finally(() => setLoadingChannels(false));
  }, [guildId]);

  const textChannels = channels.filter((c) => c.type === 0 || c.type === 5);

  const updateEmbed = (key: keyof EmbedData, value: string) => {
    setEmbed((prev) => ({ ...prev, [key]: value }));
  };

  const canSend = !!channelId && (
    tab === 'text' ? !!plainText.trim() : !!embed.description.trim()
  );

  const handleSend = async () => {
    if (!guildId || !canSend) return;
    setSending(true);
    try {
      const body: Record<string, any> = { channelId };

      if (tab === 'text') {
        body.content = plainText;
      } else {
        const embedPayload: Record<string, any> = {
          description: embed.description,
          color: embed.color,
        };
        if (embed.title) embedPayload.title = embed.title;
        if (embed.author) embedPayload.author = embed.author;
        if (embed.footer) embedPayload.footer = embed.footer;
        if (embed.image) embedPayload.image = embed.image;
        if (embed.thumbnail) embedPayload.thumbnail = embed.thumbnail;
        body.embed = embedPayload;
        if (extraContent.trim()) body.content = extraContent;
      }

      await messagesApi.send(guildId, body);
      toast.success('Mensaje enviado correctamente');

      // Reset form
      setPlainText('');
      setEmbed({ title: '', description: '', color: '#5865F2', author: '', footer: '', image: '', thumbnail: '' });
      setExtraContent('');
    } catch (err: any) {
      toast.error(err.message || 'Error al enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  // Parse color for preview
  const embedColorHex = embed.color || '#5865F2';

  const hasEmbedContent = tab === 'embed' && (
    embed.title || embed.description || embed.author || embed.footer || embed.image || embed.thumbnail
  );

  const hasTextContent = tab === 'text' && plainText.trim();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-discord-white flex items-center gap-3">
          <Send size={24} className="text-discord-blurple" />
          Enviar mensaje
        </h1>
        <p className="text-discord-muted mt-1">Envía mensajes de texto o embeds a cualquier canal del servidor</p>
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

              {/* Tab toggle */}
              <div>
                <p className="text-sm font-medium text-discord-muted mb-2">Tipo de mensaje</p>
                <div className="flex rounded-lg overflow-hidden border border-discord-lighter">
                  <button
                    onClick={() => setTab('text')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      tab === 'text'
                        ? 'bg-discord-blurple text-white'
                        : 'bg-discord-darker text-discord-muted hover:text-discord-white'
                    }`}
                  >
                    Texto simple
                  </button>
                  <button
                    onClick={() => setTab('embed')}
                    className={`flex-1 py-2 text-sm font-medium transition-colors ${
                      tab === 'embed'
                        ? 'bg-discord-blurple text-white'
                        : 'bg-discord-darker text-discord-muted hover:text-discord-white'
                    }`}
                  >
                    Embed
                  </button>
                </div>
              </div>

              {/* Text tab */}
              {tab === 'text' && (
                <Textarea
                  label="Contenido del mensaje"
                  placeholder="Escribe tu mensaje aquí..."
                  value={plainText}
                  onChange={(e) => setPlainText(e.target.value)}
                  className="min-h-[140px]"
                />
              )}

              {/* Embed tab */}
              {tab === 'embed' && (
                <div className="space-y-4">
                  <Input
                    label="Título (opcional)"
                    placeholder="Título del embed"
                    value={embed.title}
                    onChange={(e) => updateEmbed('title', e.target.value)}
                  />
                  <Textarea
                    label="Descripción"
                    placeholder="Contenido principal del embed..."
                    value={embed.description}
                    onChange={(e) => updateEmbed('description', e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Color del embed"
                      type="color"
                      value={embed.color}
                      onChange={(e) => updateEmbed('color', e.target.value)}
                    />
                    <Input
                      label="Nombre del autor (opcional)"
                      placeholder="Nombre del autor"
                      value={embed.author}
                      onChange={(e) => updateEmbed('author', e.target.value)}
                    />
                  </div>
                  <Input
                    label="Texto del pie de página (opcional)"
                    placeholder="Texto del footer"
                    value={embed.footer}
                    onChange={(e) => updateEmbed('footer', e.target.value)}
                  />
                  <Input
                    label="URL de imagen / GIF (opcional)"
                    placeholder="https://..."
                    value={embed.image}
                    onChange={(e) => updateEmbed('image', e.target.value)}
                  />
                  <Input
                    label="URL de miniatura (opcional)"
                    placeholder="https://..."
                    value={embed.thumbnail}
                    onChange={(e) => updateEmbed('thumbnail', e.target.value)}
                  />
                  <Textarea
                    label="Contenido de texto adicional (opcional)"
                    placeholder="Texto fuera del embed..."
                    value={extraContent}
                    onChange={(e) => setExtraContent(e.target.value)}
                    className="min-h-[60px]"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <Button
                onClick={handleSend}
                loading={sending}
                disabled={!canSend}
              >
                <Send size={16} />
                Enviar mensaje
              </Button>
            </div>
          </Card>
        </div>

        {/* ─── Live preview ─── */}
        <div>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Eye size={18} className="text-discord-blurple" />
              <h3 className="text-lg font-semibold text-discord-white">Vista previa</h3>
            </div>

            <div className="bg-discord-darker rounded-xl p-4 min-h-[200px]">
              {!hasTextContent && !hasEmbedContent ? (
                <div className="flex items-center justify-center h-32">
                  <p className="text-discord-muted text-sm italic">
                    El mensaje aparecerá aquí mientras escribes...
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Bot avatar + name header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-discord-blurple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      B
                    </div>
                    <span className="text-discord-white font-semibold text-sm">Vapiano Bot</span>
                    <span className="text-[10px] bg-discord-blurple text-white px-1 py-0.5 rounded text-center leading-none">BOT</span>
                  </div>

                  {/* Plain text preview */}
                  {tab === 'text' && plainText && (
                    <div className="ml-10">
                      <p className="text-discord-white text-sm whitespace-pre-wrap break-words">{plainText}</p>
                    </div>
                  )}

                  {/* Embed preview */}
                  {tab === 'embed' && hasEmbedContent && (
                    <div className="ml-10">
                      {/* Extra content above embed */}
                      {extraContent.trim() && (
                        <p className="text-discord-white text-sm whitespace-pre-wrap break-words mb-2">{extraContent}</p>
                      )}
                      <div
                        className="rounded-r-lg rounded-bl-lg overflow-hidden"
                        style={{ borderLeft: `4px solid ${embedColorHex}` }}
                      >
                        <div className="bg-[#2f3136] p-3">
                          <div className="flex justify-between gap-3">
                            <div className="flex-1 min-w-0 space-y-1">
                              {/* Author */}
                              {embed.author && (
                                <p className="text-discord-white text-xs font-semibold">{embed.author}</p>
                              )}
                              {/* Title */}
                              {embed.title && (
                                <p className="text-discord-white font-bold text-sm">{embed.title}</p>
                              )}
                              {/* Description */}
                              {embed.description && (
                                <p className="text-[#dcddde] text-sm whitespace-pre-wrap break-words">
                                  {embed.description}
                                </p>
                              )}
                              {/* Image */}
                              {embed.image && (
                                <img
                                  src={embed.image}
                                  alt="embed image"
                                  className="mt-2 max-w-full rounded-lg max-h-48 object-contain"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              )}
                              {/* Footer */}
                              {embed.footer && (                                  <p className="text-[#a3a6aa] text-xs mt-2 pt-1 border-t border-[#40444b]">
                                  {embed.footer}
                                </p>
                              )}
                            </div>
                            {/* Thumbnail */}
                            {embed.thumbnail && (
                              <img
                                src={embed.thumbnail}
                                alt="thumbnail"
                                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
