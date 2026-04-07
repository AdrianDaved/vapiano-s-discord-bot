import { useState, useRef, KeyboardEvent } from 'react';
import { X } from 'lucide-react';

interface TagInputProps {
  label?: string;
  description?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

export default function TagInput({ label, description, tags, onChange, placeholder = 'Escribe y presiona Enter...', maxTags }: TagInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = (word: string) => {
    const trimmed = word.trim().toLowerCase();
    if (!trimmed || tags.includes(trimmed)) return;
    if (maxTags && tags.length >= maxTags) return;
    onChange([...tags, trimmed]);
  };

  const remove = (tag: string) => onChange(tags.filter(t => t !== tag));

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(input);
      setInput('');
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      remove(tags[tags.length - 1]);
    }
  };

  return (
    <div>
      {label && <p className="block text-sm font-medium text-discord-muted mb-1.5">{label}</p>}
      <div
        className="min-h-[42px] w-full bg-discord-darker border border-discord-lighter/30 rounded-md px-2 py-1.5 flex flex-wrap gap-1.5 cursor-text focus-within:border-discord-blurple transition-colors"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-discord-blurple/20 text-discord-blurple border border-discord-blurple/30">
            {tag}
            <button onClick={(e) => { e.stopPropagation(); remove(tag); }} className="hover:text-discord-red transition-colors"><X size={10} /></button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => { if (input.trim()) { add(input); setInput(''); } }}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-discord-white focus:outline-none placeholder:text-discord-muted/50"
        />
      </div>
      {description && <p className="text-xs text-discord-muted mt-1">{description}</p>}
      {maxTags && <p className="text-xs text-discord-muted/50 mt-0.5">{tags.length}/{maxTags} palabras</p>}
    </div>
  );
}
