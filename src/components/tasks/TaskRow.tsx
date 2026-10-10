import { Target } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatRange } from '@/domain/dates';
import type { Task } from '@/domain/types';
import { DeadlineChip, DeadlineTypeBadge, StatusBadge } from '@/components/ui/Badges';
import { TaskCheckbox } from '@/components/ui/Checkbox';
import { cn } from '@/components/ui/cn';
import { TaskMenu } from './TaskMenu';

export function TaskRow({ task, flash }: { task: Task; flash?: boolean }) {
  const { today, toggleDone, openDetails } = useApp();
  const done = task.status === 'Готово';
  const skipped = task.status === 'Не требуется';
  return (
    <li
      id={`task-${task.uid}`}
      className={cn(
        'group grid scroll-mt-28 grid-cols-[22px_36px_minmax(0,1fr)_32px] items-start gap-x-3 px-4 py-3.5 transition-colors hover:bg-[#FAFBFC] sm:px-5 lg:grid-cols-[22px_40px_minmax(0,1fr)_108px_104px_150px_32px] lg:items-center',
        flash && 'animate-flash rounded-xl bg-rose-50/60',
      )}
    >
      <TaskCheckbox
        checked={done}
        disabled={skipped}
        onToggle={() => void toggleDone(task)}
        label={done ? `Вернуть «${task.title}» в предыдущий статус` : `Отметить «${task.title}» выполненной`}
        className="mt-0.5 lg:mt-0"
      />
      <span className={cn('pt-0.5 text-[13.5px] font-medium tabular-nums lg:pt-0', done || skipped ? 'text-ink-faint' : 'text-ink-muted')}>
        {task.id}
      </span>
      <div className="min-w-0">
        <button
          type="button"
          onClick={() => openDetails(task)}
          className={cn(
            'text-left text-[14px] font-medium leading-snug transition hover:text-rose-600',
            done ? 'text-ink-muted' : skipped ? 'text-ink-faint line-through' : 'text-ink',
          )}
        >
          {task.title}
        </button>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12.5px] text-ink-muted">
          <span className="whitespace-nowrap">{task.assignee}</span>
          <DeadlineTypeBadge type={task.deadlineType} className="h-5 px-1.5 text-[11px]" />
          {task.conditional && <span className="rounded-md bg-lilac-50 px-1.5 py-0.5 text-[11px] font-medium text-lilac-500">условная</span>}
          {task.result && (
            <span className="inline-flex items-center gap-1 text-ink-faint" title="Ожидаемый результат (Excel)">
              <Target className="h-3 w-3" aria-hidden />
              {task.result}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 lg:hidden">
          <span className="mr-1 whitespace-nowrap text-[12.5px] tabular-nums text-ink-muted">{formatRange(task.startDate, task.dueDate)}</span>
          {!done && <StatusBadge status={task.status} className="h-6" />}
          <DeadlineChip task={task} today={today} className="h-6 min-w-0" />
        </div>
        {task.description && <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-soft">{task.description}</p>}
      </div>
      <span className="hidden text-[13px] tabular-nums text-ink-muted lg:block">{formatRange(task.startDate, task.dueDate)}</span>
      <span className="hidden lg:block">
        <StatusBadge status={task.status} />
      </span>
      <span className="hidden lg:block">
        <DeadlineChip task={task} today={today} />
      </span>
      <TaskMenu task={task} className="-mt-1 lg:mt-0" />
    </li>
  );
}
