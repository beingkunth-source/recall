import type { ReactNode } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  color: string;
}

const colorMap: Record<string, { bg: string; iconBg: string }> = {
  green: { bg: 'bg-primary-50', iconBg: 'bg-primary-100 text-primary-600' },
  blue: { bg: 'bg-blue-50', iconBg: 'bg-blue-100 text-blue-600' },
  red: { bg: 'bg-red-50', iconBg: 'bg-red-100 text-red-600' },
  amber: { bg: 'bg-amber-50', iconBg: 'bg-amber-100 text-amber-600' },
  purple: { bg: 'bg-purple-50', iconBg: 'bg-purple-100 text-purple-600' },
  slate: { bg: 'bg-slate-50', iconBg: 'bg-slate-100 text-slate-600' },
};

function StatsCard({ icon, label, value, color }: StatsCardProps) {
  const colors = colorMap[color] ?? colorMap.slate;

  return (
    <div
      className={`flex items-center gap-4 p-5 rounded-lg border border-slate-100 ${colors.bg}`}
    >
      <div
        className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.iconBg}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-800">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}

export default StatsCard;
