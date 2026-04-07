import { useRef } from 'react';

interface Variable { tag: string; description: string; }

interface VariableTextareaProps {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  variables: Variable[];
  maxLength?: number;
  rows?: number;
  placeholder?: string;
  description?: string;
}

export default function VariableTextarea({ label, value, onChange, variables, maxLength, rows = 3, placeholder, description }: VariableTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const insertVar = (tag: string) => {
    const el = ref.current;
    if (!el) { onChange(value + tag); return; }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const newVal = value.slice(0, start) + tag + value.slice(end);
    onChange(newVal);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <p className="block text-sm font-medium text-discord-muted">{label}</p>
          {maxLength && <span className={`text-xs ${value.length > maxLength * 0.9 ? 'text-discord-red' : 'text-discord-muted'}`}>{value.length}/{maxLength}</span>}
        </div>
      )}
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full bg-discord-darker border border-discord-lighter/30 rounded-md px-3 py-2 text-sm text-discord-white focus:outline-none focus:border-discord-blurple resize-y min-h-[80px]"
      />
      {variables.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {variables.map(v => (
            <button
              key={v.tag}
              onClick={() => insertVar(v.tag)}
              title={v.description}
              className="text-xs px-2 py-1 rounded-md bg-discord-blurple/20 text-discord-blurple border border-discord-blurple/30 hover:bg-discord-blurple/30 transition-colors font-mono"
            >
              {v.tag}
            </button>
          ))}
          <span className="text-xs text-discord-muted/60 self-center">← click para insertar</span>
        </div>
      )}
      {description && <p className="text-xs text-discord-muted mt-1">{description}</p>}
    </div>
  );
}
