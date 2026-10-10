import { ChevronDown } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { useApp } from '@/context/AppContext';
import { formatRange } from '@/domain/dates';
import type { Task } from '@/domain/types';
import { DeadlineChip, DeadlineTypeBadge, StatusBadge } from '@/components/ui/Badges';
import { TaskCheckbox } from '@/components/ui/Checkbox';
import { cn } from '@/components/ui/cn';

export function Accordion({
  title,
  subtitle,
  children,
  defaultOpen = false,
  aside,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  aside?: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className={cn('card overflow-hidden', className)}>
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[#FAFBFC] sm:px-6"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold text-ink">{title}</span>
            {subtitle && <span className="mt-0.5 block text-[12.5px] font-normal text-ink-muted">{subtitle}</span>}
          </span>
          {aside}
          <ChevronDown className={cn('h-5 w-5 shrink-0 text-ink-muted transition', open && 'rotate-180')} />
        </button>
      </h3>
      {open && (
        <div id={id} className="border-t border-line px-5 py-5 sm:px-6">
          {children}
        </div>
      )}
    </section>
  );
}

/** Компактная строка задачи с живым статусом (используется в «Описании»). */
export function TaskLine({ task }: { task: Task }) {
  const { today, toggleDone, openDetails } = useApp();
  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-2 py-3 sm:flex-nowrap sm:items-center">
      <TaskCheckbox
        checked={task.status === 'Готово'}
        disabled={task.status === 'Не требуется'}
        onToggle={() => void toggleDone(task)}
        label={`Отметить «${task.title}» выполненной`}
        className="mt-0.5 sm:mt-0"
      />
      <span className="w-9 shrink-0 pt-0.5 text-[13px] font-medium tabular-nums text-ink-muted sm:pt-0">{task.id}</span>
      <button type="button" onClick={() => openDetails(task)} className="min-w-0 flex-1 text-left">
        <span className={cn('block text-[13.5px] font-medium leading-snug hover:text-rose-600', task.status === 'Готово' ? 'text-ink-muted' : 'text-ink')}>
          {task.title}
        </span>
        <span className="mt-0.5 block text-[12px] text-ink-muted">
          {formatRange(task.startDate, task.dueDate)} · {task.assignee}
          {task.result && ` · ${task.result}`}
        </span>
      </button>
      <div className="flex flex-wrap items-center gap-1.5 pl-[70px] sm:pl-0">
        <DeadlineTypeBadge type={task.deadlineType} />
        <StatusBadge status={task.status} />
        <DeadlineChip task={task} today={today} className="hidden md:inline-flex" />
      </div>
    </li>
  );
}

export function Callout({ tone = 'info', title, children }: { tone?: 'info' | 'warn' | 'pink'; title?: ReactNode; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-2xl px-4 py-3.5 text-[13.5px] leading-relaxed',
        tone === 'info' && 'bg-lilac-50 text-ink-soft',
        tone === 'warn' && 'bg-amber-50 text-ink-soft',
        tone === 'pink' && 'bg-rose-50 text-ink-soft',
      )}
    >
      {title && <p className="mb-1 font-semibold text-ink">{title}</p>}
      {children}
    </div>
  );
}
