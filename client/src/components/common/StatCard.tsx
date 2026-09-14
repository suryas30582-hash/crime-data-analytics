import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  variant?: 'cyan' | 'emerald' | 'crimson' | 'amber' | 'violet' | 'blue';
  trend?: {
    value: string | number;
    isPositive?: boolean;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  variant = 'cyan',
  trend
}) => {
  const variantStyles = {
    cyan: {
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      glow: 'group-hover:shadow-[0_0_20px_rgba(6,182,212,0.15)]',
      valColor: 'text-white'
    },
    emerald: {
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      glow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
      valColor: 'text-emerald-400'
    },
    crimson: {
      border: 'border-rose-500/20 hover:border-rose-500/40',
      iconBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      glow: 'group-hover:shadow-[0_0_20px_rgba(244,63,94,0.15)]',
      valColor: 'text-rose-400'
    },
    amber: {
      border: 'border-amber-500/20 hover:border-amber-500/40',
      iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      valColor: 'text-amber-300'
    },
    violet: {
      border: 'border-violet-500/20 hover:border-violet-500/40',
      iconBg: 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
      glow: 'group-hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]',
      valColor: 'text-violet-300'
    },
    blue: {
      border: 'border-blue-500/20 hover:border-blue-500/40',
      iconBg: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      glow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
      valColor: 'text-blue-300'
    }
  };

  const style = variantStyles[variant];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-[#0c1326]/75 p-5 backdrop-blur-xl border transition-all duration-200 ${style.border} ${style.glow}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400 tracking-wide uppercase font-mono">
            {title}
          </p>
          <div className="flex items-baseline space-x-2">
            <h3 className={`text-2xl sm:text-3xl font-bold tracking-tight ${style.valColor}`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </h3>
            {trend && (
              <span
                className={`text-[11px] font-semibold ${
                  trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtext && <p className="text-xs text-slate-400 pt-0.5">{subtext}</p>}
        </div>

        <div className={`rounded-xl p-3 ${style.iconBg} transition-transform group-hover:scale-105`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};
