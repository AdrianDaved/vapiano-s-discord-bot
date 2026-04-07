import { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface Role { id: string; name: string; color: number; }

interface RoleMultiSelectProps {
  label?: string;
  description?: string;
  roles: Role[];
  selected: string[];
  onChange: (v: string[]) => void;
}

export default function RoleMultiSelect({ label, description, roles, selected, onChange }: RoleMultiSelectProps) {
  const [adding, setAdding] = useState('');
  const selectedRoles = selected.map(id => roles.find(r => r.id === id) || { id, name: id, color: 0 });
  const available = roles.filter(r => !selected.includes(r.id));

  const add = (id: string) => { if (id && !selected.includes(id)) onChange([...selected, id]); setAdding(''); };
  const remove = (id: string) => onChange(selected.filter(r => r !== id));

  return (
    <div>
      {label && <p className="block text-sm font-medium text-discord-muted mb-1.5">{label}</p>}
      {selectedRoles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedRoles.map(r => (
            <span key={r.id} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
              style={r.color ? { backgroundColor: `#${r.color.toString(16).padStart(6,'0')}22`, borderColor: `#${r.color.toString(16).padStart(6,'0')}`, color: `#${r.color.toString(16).padStart(6,'0')}` } : { backgroundColor: 'rgb(79 84 92 / 0.3)', borderColor: 'rgb(79 84 92)', color: '#b9bbbe' }}>
              {r.name}
              <button onClick={() => remove(r.id)} className="ml-1 hover:text-red-400 transition-colors"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      {available.length > 0 ? (
        <div className="flex gap-2">
          <select value={adding} onChange={e => setAdding(e.target.value)}
            className="flex-1 bg-discord-darker border border-discord-lighter/30 rounded-md px-3 py-2 text-sm text-discord-white focus:outline-none focus:border-discord-blurple">
            <option value="">Seleccionar rol para agregar...</option>
            {available.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button onClick={() => add(adding)} disabled={!adding}
            className="px-3 py-2 rounded-md bg-discord-blurple text-white text-sm font-medium disabled:opacity-40 hover:bg-discord-blurple/80 transition-colors">
            <Plus size={14} />
          </button>
        </div>
      ) : (
        <p className="text-xs text-discord-muted italic">No hay más roles disponibles</p>
      )}
      {description && <p className="text-xs text-discord-muted mt-1">{description}</p>}
    </div>
  );
}
