interface EmbedPreviewProps {
  title?: string;
  description?: string;
  color?: string;
  footerText?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
}

const PREVIEW_VARS: Record<string, string> = {
  '{user}': '@Usuario',
  '{username}': 'usuario',
  '{number}': '#0042',
  '{panel}': 'Panel',
  '{server}': 'Tu servidor',
  '{memberCount}': '1234',
  '{inviter}': '@Invitador',
  '{staff}': '@Staff',
};

function resolveVars(text: string) {
  let result = text;
  for (const [k, v] of Object.entries(PREVIEW_VARS)) {
    result = result.split(k).join(v);
  }
  return result;
}

export default function DiscordEmbedPreview({ title, description, color = '#5865F2', footerText, fields }: EmbedPreviewProps) {
  if (!title && !description) return null;

  const borderColor = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#5865F2';

  return (
    <div className="rounded-md overflow-hidden bg-discord-darker border border-discord-lighter/20 mt-2">
      <div className="flex">
        <div className="w-1 flex-shrink-0" style={{ backgroundColor: borderColor }} />
        <div className="flex-1 p-3 space-y-1 min-w-0">
          {title && (
            <p className="text-sm font-semibold text-discord-white leading-snug">
              {resolveVars(title)}
            </p>
          )}
          {description && (
            <p className="text-xs text-discord-muted/90 whitespace-pre-wrap break-words leading-relaxed">
              {resolveVars(description)}
            </p>
          )}
          {fields && fields.length > 0 && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {fields.map((f, i) => (
                <div key={i} className={f.inline ? '' : 'col-span-2'}>
                  <p className="text-xs font-semibold text-discord-white">{f.name}</p>
                  <p className="text-xs text-discord-muted">{f.value}</p>
                </div>
              ))}
            </div>
          )}
          {footerText && <p className="text-xs text-discord-muted/60 pt-1 border-t border-discord-lighter/20">{footerText}</p>}
        </div>
      </div>
      <div className="px-3 py-1.5 border-t border-discord-lighter/10">
        <p className="text-xs text-discord-muted/40 italic">Vista previa — los valores reales se insertan al crear el ticket</p>
      </div>
    </div>
  );
}
