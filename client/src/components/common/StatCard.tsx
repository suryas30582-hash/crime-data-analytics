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
      border: 'border-[#EEDFD9] hover:border-[#883A2E]/50',
      iconBg: 'bg-[#883A2E]/10 text-[#883A2E] border border-[#883A2E]/20',
      glow: 'group-hover:shadow-warm',
      valColor: 'text-[#2B1F1D]'
    },
    emerald: {
      border: 'border-[#EEDFD9] hover:border-[#2E7D32]/50',
      iconBg: 'bg-[#2E7D32]/10 text-[#2E7D32] border border-[#2E7D32]/20',
      glow: 'group-hover:shadow-warm',
      valColor: 'text-[#2E7D32]'
    },
    crimson: {
      border: 'border-[#EEDFD9] hover:border-[#D65A31]/50',
      iconBg: 'bg-[#D65A31]/10 text-[#D65A31] border border-[#D65A31]/20',
      glow: 'group-hover:shadow-warm',
      valColor: 'text-[#D65A31]'
    },
    amber: {
      border: 'border-[#EEDFD9] hover:border-[#C47A5A]/50',
      iconBg: 'bg-[#C47A5A]/10 text-[#C47A5A] border border-[#C47A5A]/20',
      glow: 'group-hover:shadow-warm',
      valColor: 'text-[#C47A5A]'
    },
    violet: {
      border: 'border-[#EEDFD9] hover:border-[#542A20]/50',
      iconBg: 'bg-[#542A20]/10 text-[#542A20] border border-[#542A20]/20',
      glow: 'group-hover:shadow-warm',
      valColor: 'text-[#542A20]'
    },
    blue: {
      border: 'border-[#EEDFD9] hover:border-[#883A2E]/50',
      iconBg: 'bg-[#883A2E]/10 text-[#883A2E] border border-[#883A2E]/20',
      glow: 'group-hover:shadow-warm',
      valColor: 'text-[#2B1F1D]'
    }
  };

  const style = variantStyles[variant];

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-[#FFFDFC] p-5 border shadow-warm-sm hover:shadow-warm transition-all duration-200 ${style.border} ${style.glow}`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#7A6360] tracking-wide uppercase font-mono">
            {title}
          </p>
          <div className="flex items-baseline space-x-2">
            <h3 className={`text-2xl sm:text-3xl font-bold tracking-tight ${style.valColor}`}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </h3>
            {trend && (
              <span
                className={`text-[11px] font-semibold ${
                  trend.isPositive ? 'text-[#2E7D32]' : 'text-[#D65A31]'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtext && <p className="text-xs text-[#7A6360] pt-0.5">{subtext}</p>}
        </div>

        <div className={`rounded-xl p-3 ${style.iconBg} transition-transform group-hover:scale-105`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};
