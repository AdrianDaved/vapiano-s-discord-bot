import { LucideIcon, TrendingUp } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  accent?: 'blue' | 'green' | 'yellow' | 'pink' | 'red';
  trend?: number;
}

const accentClasses = {
  blue:   { bg: 'stat-accent-blue',   icon: 'icon-glow-blue' },
  green:  { bg: 'stat-accent-green',  icon: 'icon-glow-green' },
  yellow: { bg: 'stat-accent-yellow', icon: 'icon-glow-yellow' },
  pink:   { bg: 'stat-accent-pink',   icon: 'icon-glow-pink' },
  red:    { bg: 'stat-accent-red',    icon: 'icon-glow-red' },
};

export default function StatCard({ label, value, icon: Icon, accent = 'blue', trend }: StatCardProps) {
  const styles = accentClasses[accent];
  return (
    <div className={`rounded-2xl p-5 border flex items-center gap-4 ${styles.bg}`} style={{ transition: 'box-shadow .15s' }}>
      <div className={styles.icon}>
        <Icon size={22} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-discord-white tabular-nums">{value}</p>
        <p className="text-xs text-discord-muted mt-0.5 truncate">{label}</p>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? 'text-discord-green' : 'text-discord-red'}`}>
          <TrendingUp size={12} className={trend < 0 ? 'rotate-180' : ''} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}
