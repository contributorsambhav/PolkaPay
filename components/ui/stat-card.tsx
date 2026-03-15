'use client';

import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  /** Prevent value from overflowing on small screens */
  valueClassName?: string;
}

/**
 * Analytics/stat card with title at top (reference layout).
 * Uses theme colors only. Responsive: no overflow.
 */
export function StatCard({ title, value, subtitle, icon, className, valueClassName }: StatCardProps) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col rounded-xl border border-border bg-card p-4 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-muted-foreground leading-tight">{title}</h3>
        {icon && <div className="shrink-0 text-muted-foreground">{icon}</div>}
      </div>
      <div className={cn('mt-2 min-w-0 overflow-hidden', valueClassName)}>
        {value}
      </div>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  );
}
