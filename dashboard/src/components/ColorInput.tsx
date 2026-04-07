import { useState } from 'react';

const DISCORD_PRESETS = ['#5865F2','#57F287','#FEE75C','#ED4245','#EB459E','#00B0F4','#FFFFFF','#23272A'];

interface ColorInputProps {
  label?: string;
  value: string;
  onChange: (hex: string) => void;
  description?: string;
}

export default function ColorInput({ label, value, onChange, description }: ColorInputProps) {
  const [textVal, setTextVal] = useState(value);
  const hexRegex = /^#[0-9a-fA-F]{6}$/;

  return (
    <div>
      {label && <p className="block text-sm font-medium text-discord-muted mb-1.5">{label}</p>}
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={hexRegex.test(value) ? value : '#5865F2'}
          onChange={(e) => { setTextVal(e.target.value); onChange(e.target.value); }}
          className="w-10 h-10 rounded cursor-pointer border border-discord-lighter/30 bg-transparent p-0.5"
        />
        <input
          type="text"
          value={textVal}
          onChange={(e) => {
            setTextVal(e.target.value);
            if (hexRegex.test(e.target.value)) onChange(e.target.value);
          }}
          onBlur={() => { if (!hexRegex.test(textVal)) setTextVal(value); }}
          maxLength={7}
          placeholder="#5865F2"
          className={`w-28 bg-discord-darker border rounded-md px-3 py-2 text-sm text-discord-white font-mono focus:outline-none focus:border-discord-blurple ${hexRegex.test(textVal) ? 'border-discord-lighter/30' : 'border-discord-red'}`}
        />
      </div>
      <div className="flex gap-1.5 mt-2">
        {DISCORD_PRESETS.map(c => (
          <button
            key={c}
            onClick={() => { onChange(c); setTextVal(c); }}
            className="w-5 h-5 rounded-full border-2 transition-all hover:scale-110"
            style={{ backgroundColor: c, borderColor: value === c ? '#fff' : 'transparent' }}
            title={c}
          />
        ))}
      </div>
      {description && <p className="text-xs text-discord-muted mt-1">{description}</p>}
    </div>
  );
}
