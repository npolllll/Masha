import { CalendarClock, Check, Flag, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { deadlineTone, relativeDeadlineLabel, type ChipTone } from '@/domain/deadlines';
import type { DeadlineType, ISODate, StageStatus, Task, TaskStatus } from '@/domain/types';
import { cn } from './cn';

export function Chip({ className, children, title }: { className?: string; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={cn('inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-[12.5px] font-medium', className)}
    >
      {children}
    </span>
  );
}

const STATUS_STYLE: Record<TaskStatus, string> = {
  'Не начато': 'bg-[#F2F3F7] text-ink-muted',
  'В работе': 'bg-amber-50 text-amber-600',
  Готово: 'bg-mint-50 text-mint-600',
  'Не требуется': 'bg-[#F2F3F7] text-ink-faint line-through decoration-1',
};

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <Chip className={cn(STATUS_STYLE[status], 'h-6 rounded-md px-2 text-[12px]', className)}>
      <span
        aria-hidden
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'Готово' && 'bg-mint-500',
          status === 'В работе' && 'bg-amber-500',
          status === 'Не начато' && 'bg-ink-faint',
          status === 'Не требуется' && 'bg-ink-faint/60',
        )}
      />
      {status}
    </Chip>
  );
}

const TYPE_STYLE: Record<DeadlineType, string> = {
  Жёсткий: 'border-rose-200 bg-rose-50 text-rose-600',
  Плановый: 'border-line bg-white text-ink-muted',
  Ориентир: 'border-lilac-200 bg-lilac-50 text-lilac-500',
};

export function DeadlineTypeBadge({ type, className }: { type: DeadlineType; className?: string }) {
  return (
    <span
      className={cn('inline-flex h-6 items-center rounded-md border px-2 text-[11.5px] font-medium', TYPE_STYLE[type], className)}
      title={type === 'Ориентир' ? 'Ориентировочная дата — не подтверждённый дедлайн' : `${type} срок`}
    >
      {type}
    </span>
  );
}

const STAGE_STATUS_STYLE: Record<StageStatus, string> = {
  'Не начат': 'bg-[#F2F3F7] text-ink-muted',
  'В работе': 'bg-amber-50 text-amber-600',
  Закрыт: 'bg-mint-50 text-mint-600',
};

export function StageStatusBadge({ status, className }: { status: StageStatus; className?: string }) {
  return <Chip className={cn('h-6 rounded-md px-2 text-[12px]', STAGE_STATUS_STYLE[status], className)}>{status}</Chip>;
}

const TONE_STYLE: Record<ChipTone, string> = {
  done: 'bg-mint-50 text-mint-600',
  skipped: 'bg-[#F2F3F7] text-ink-faint',
  overdue: 'bg-[#FDECEC] text-[#D93A3F]',
  urgent: 'bg-rose-50 text-rose-600',
  soon: 'bg-amber-50 text-amber-600',
  neutral: 'bg-[#F2F3F7] text-ink-muted',
};

export function DeadlineChip({ task, today, className }: { task: Task; today: ISODate; className?: string }) {
  const tone = deadlineTone(task, today);
  const label = relativeDeadlineLabel(task, today);
  const Icon = tone === 'done' ? Check : tone === 'skipped' ? Minus : tone === 'overdue' ? CalendarClock : Flag;
  return (
    <Chip className={cn('min-w-[118px] justify-start', TONE_STYLE[tone], className)} title={`Дедлайн: ${task.dueDate}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} aria-hidden />
      {label}
    </Chip>
  );
}

export function CountBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-grid h-6 min-w-6 place-items-center rounded-md border border-rose-300 bg-rose-50 px-1.5 text-[12px] font-semibold text-rose-600',
        className,
      )}
    >
      {children}
    </span>
  );
}
