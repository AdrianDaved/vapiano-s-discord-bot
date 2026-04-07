interface ChannelSelectProps {
  label?: string;
  description?: string;
  channels: { id: string; name: string; type: number; parentId: string | null }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function ChannelSelect({ label, description, channels, value, onChange, placeholder = 'Sin canal (desactivado)' }: ChannelSelectProps) {
  const textChannels = channels.filter((c) => c.type === 0 || c.type === 5);
  return (
    <div>
      {label && <p className="block text-sm font-medium text-discord-muted mb-1.5">{label}</p>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-discord-darker border border-discord-lighter/30 rounded-md px-3 py-2 text-sm text-discord-white focus:outline-none focus:border-discord-blurple"
      >
        <option value="">{placeholder}</option>
        {textChannels.map((c) => (
          <option key={c.id} value={c.id}>#{c.name}</option>
        ))}
      </select>
      {description && <p className="text-xs text-discord-muted mt-1">{description}</p>}
    </div>
  );
}
