import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
}

export default function StatCard({ label, value, icon: Icon, color = 'text-discord-blurple' }: StatCardProps) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl bg-discord-lighter ${color}`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-2xl font-bold text-discord-white">{value}</p>
        <p className="text-sm text-discord-muted">{label}</p>
      </div>
    </div>
  );
}
