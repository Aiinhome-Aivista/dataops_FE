import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  label: string;
  value: string;
  trend?: string;
  trendDir?: 'up' | 'down' | 'flat';
  icon?: LucideIcon;
  accent?: 'default' | 'blue' | 'amber' | 'emerald' | 'red';
}

export function StatCard({ label, value, trend, trendDir = 'flat', icon: Icon, accent = 'default' }: Props) {
  const trendColor =
    trendDir === 'up'
      ? 'text-emerald-600'
      : trendDir === 'down'
        ? 'text-red-600'
        : 'text-[#6B7280]';

  return (
    <div className="bg-white border border-[#E5E7EB] p-6 rounded-lg hover:border-gray-300 transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#9CA3AF] font-bold">
          {label}
        </p>
        {Icon && (
          <div
            className={cn(
              'w-7 h-7 rounded-md border flex items-center justify-center transition-colors',
              accent === 'blue' && 'border-blue-100 bg-blue-50 text-blue-600',
              accent === 'amber' && 'border-amber-100 bg-amber-50 text-amber-600',
              accent === 'emerald' && 'border-emerald-100 bg-emerald-50 text-emerald-600',
              accent === 'red' && 'border-red-100 bg-red-50 text-red-600',
              accent === 'default' && 'border-gray-100 bg-gray-50 text-gray-600',
            )}
          >
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <h3 className="text-3xl font-light italic text-[#111827] tracking-tight tabular-nums">
          {value}
        </h3>
        {trend && (
          <span className={cn('text-[10px] font-bold uppercase tracking-tight', trendColor)}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
