import { useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

const QUICK_EMOJIS = [
  '🎫','📩','🔧','🛠️','💬','📋','⭐','🚨','🔒','🔓',
  '✅','❌','⚠️','📌','💡','🤝','🏷️','🎯','📞','💻',
  '🔎','⚡','🌐','📝','🗂️','🛡️','🚀','💎','🎮','🏆',
  '💰','🐀','👑','🔥','❄️','🌟','🎪','🎭','⚔️','🦁',
];

interface EmojiInputProps {
  label?: string;
  value: string;
  onChange: (emoji: string) => void;
  description?: string;
}

export default function EmojiInput({ label, value, onChange, description }: EmojiInputProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {label && <p className="block text-sm font-medium text-discord-muted mb-1.5">{label}</p>}
      <div className="flex items-center gap-2">
        <div className="w-12 h-10 flex items-center justify-center bg-discord-darker border border-discord-lighter/30 rounded-md text-2xl">
          {value || <span className="text-discord-muted text-xs">?</span>}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="🎫 o <:nombre:id>"
          className="flex-1 bg-discord-darker border border-discord-lighter/30 rounded-md px-3 py-2 text-sm text-discord-white focus:outline-none focus:border-discord-blurple"
        />
        {value && (
          <button onClick={() => onChange('')} className="p-2 text-discord-muted hover:text-discord-red transition-colors rounded-md hover:bg-discord-darker">
            <X size={14} />
          </button>
        )}
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 px-3 py-2 rounded-md bg-discord-darker border border-discord-lighter/30 text-xs text-discord-muted hover:text-discord-white transition-colors"
        >
          Sugerencias {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>
      {open && (
        <div className="mt-2 p-3 rounded-lg bg-discord-darker border border-discord-lighter/20">
          <div className="grid grid-cols-10 gap-1">
            {QUICK_EMOJIS.map(e => (
              <button
                key={e}
                onClick={() => { onChange(e); setOpen(false); }}
                className={`text-xl p-1.5 rounded hover:bg-discord-lighter transition-colors ${value === e ? 'bg-discord-blurple/30 ring-1 ring-discord-blurple' : ''}`}
                title={e}
              >
                {e}
              </button>
            ))}
          </div>
          <p className="text-xs text-discord-muted mt-2">Para emojis personalizados de Discord usa el formato: <code className="bg-discord-lighter px-1 rounded">&lt;:nombre:123456789&gt;</code></p>
        </div>
      )}
      {description && <p className="text-xs text-discord-muted mt-1">{description}</p>}
    </div>
  );
}
