import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
  statusColor?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  subtext,
  icon: Icon,
  badge,
  badgeColor = 'bg-sentinel-surface text-sentinel-textSecondary border-sentinel-border',
  statusColor = 'text-white',
}) => {
  return (
    <div className="p-4 rounded-xl bg-sentinel-panel border border-sentinel-border shadow-card flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-sentinel-surface border border-sentinel-borderSubtle flex items-center justify-center text-sentinel-textSecondary">
            <Icon className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-medium text-sentinel-textSecondary truncate">{label}</span>
        </div>
        {badge && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>

      <div className="my-1 flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold font-mono tracking-tight ${statusColor}`}>
          {value}
        </span>
        {unit && <span className="text-xs font-mono text-sentinel-muted">{unit}</span>}
      </div>

      {subtext && <p className="text-[11px] text-sentinel-muted truncate mt-0.5">{subtext}</p>}
    </div>
  );
};
