import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'danger' | 'info' | 'purple';
  };
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  onClick
}) => {
  const badgeColors = {
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  };

  return (
    <div
      onClick={onClick}
      className={`glass-panel rounded-2xl p-5 hover:border-brand-400 dark:hover:border-brand-400/50 transition-all shadow-sm hover:shadow-md ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
          {title}
        </span>
        <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-100 to-purple-100 dark:from-brand-950/60 dark:to-purple-950/60 text-brand-600 dark:text-brand-300 border border-brand-200/50 dark:border-datacore-darkBorder">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</div>
        {badge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColors[badge.variant]}`}>
            {badge.text}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
  );
};
