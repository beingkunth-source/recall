import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  color: string;
  onClick?: () => void;
}

const colorMap: Record<string, { badge: string; icon: string }> = {
  red: { badge: 'bg-red-50 border border-red-100/80', icon: 'text-red-500' },
  blue: { badge: 'bg-sky-50 border border-sky-100/80', icon: 'text-sky-500' },
  rose: { badge: 'bg-rose-50 border border-rose-100/80', icon: 'text-rose-500' },
  amber: { badge: 'bg-amber-50 border border-amber-100/80', icon: 'text-amber-500' },
};

function StatsCard({ icon, label, value, color, onClick }: StatsCardProps) {
  const c = colorMap[color] ?? colorMap.red;

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-4 rounded-2xl bg-white/75 backdrop-blur-md border border-white/85 shadow-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:bg-white/90 hover:scale-[1.01] hover:shadow-md' : ''
      }`}
    >
      <div className="flex items-center gap-3.5">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${c.badge} ${c.icon}`}>
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold text-slate-900 tracking-tight leading-none mb-1">
            {value}
          </p>
          <p className="text-xs font-medium text-slate-500">{label}</p>
        </div>
      </div>
      <ChevronRight size={18} className="text-slate-400/80" />
    </div>
  );
}

export default StatsCard;
