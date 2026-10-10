import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from './cn';

export type ProgressTone = 'pink' | 'green' | 'amber' | 'grey' | 'lilac';

const BAR: Record<ProgressTone, string> = {
  pink: 'bg-rose-500',
  green: 'bg-mint-500',
  amber: 'bg-amber-500',
  grey: 'bg-ink-faint',
  lilac: 'bg-lilac-500',
};

export function ProgressBar({
  value,
  tone = 'pink',
  className,
  trackClassName,
  label,
  height = 6,
}: {
  value: number;
  tone?: ProgressTone;
  className?: string;
  trackClassName?: string;
  label?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={cn('w-full overflow-hidden rounded-full bg-[#EEF0F4]', trackClassName, className)}
      style={{ height }}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-300 ease-out', BAR[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

const RING: Record<ProgressTone, string> = {
  pink: '#FF2D70',
  green: '#20C997',
  amber: '#F2A33A',
  grey: '#B4BAC7',
  lilac: '#7C6FE6',
};

export function ProgressRing({
  value,
  size = 120,
  stroke = 12,
  tone = 'pink',
  children,
  label,
  trackColor = '#EFF1F5',
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: ProgressTone;
  children?: ReactNode;
  label?: string;
  trackColor?: string;
}) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const offset = c * (1 - v);
  return (
    <div
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(v * 100)}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        {v > 0 && (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={RING[tone]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            initial={reduce ? false : { strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
