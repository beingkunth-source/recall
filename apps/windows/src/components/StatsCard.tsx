import type { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  color: string;
}

const colorMap: Record<string, { bg: string; iconBg: string }> = {
  green: { bg: 'bg-emerald-50/80', iconBg: 'bg-emerald-100 text-emerald-600' },
  blue: { bg: 'bg-sky-50/80', iconBg: 'bg-sky-100 text-sky-600' },
  red: { bg: 'bg-rose-50/80', iconBg: 'bg-rose-100 text-rose-600' },
  amber: { bg: 'bg-amber-50/80', iconBg: 'bg-amber-100 text-amber-600' },
  purple: { bg: 'bg-primary-50/80', iconBg: 'bg-primary-100 text-primary-600' },
  slate: { bg: 'bg-slate-50/80', iconBg: 'bg-slate-100 text-slate-600' },
};

function StatsCard({ icon, label, value, color }: StatsCardProps) {
  const colors = colorMap[color] ?? colorMap.slate;

  return (
    <div
      className={`liquid-card flex items-center gap-4 p-5 rounded-2xl ${colors.bg}`}
    >
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors.iconBg}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-800 font-display tracking-tight">
          {value}
        </p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}

export default StatsCard;
