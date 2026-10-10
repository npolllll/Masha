import * as DM from '@radix-ui/react-dropdown-menu';
import { Ban, Check, Circle, CircleDot, Eye, History, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import type { Task, TaskStatus } from '@/domain/types';
import { cn } from '@/components/ui/cn';

const STATUS_ITEMS: { status: TaskStatus; icon: typeof Circle; tone: string }[] = [
  { status: 'Не начато', icon: Circle, tone: 'text-ink-muted' },
  { status: 'В работе', icon: CircleDot, tone: 'text-amber-500' },
  { status: 'Готово', icon: Check, tone: 'text-mint-500' },
];

const itemCls =
  'flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] text-ink outline-none data-[highlighted]:bg-[#F4F5F8] data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

export function TaskMenu({ task, className, withOpen = true }: { task: Task; className?: string; withOpen?: boolean }) {
  const { openEdit, openDetails, setStatus, requestDelete, openHistory } = useApp();
  return (
    <DM.Root>
      <DM.Trigger asChild>
        <button
          type="button"
          aria-label={`Действия с задачей ${task.id}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'grid h-8 w-8 place-items-center rounded-lg text-ink-muted transition hover:bg-[#F2F3F7] hover:text-ink data-[state=open]:bg-[#F2F3F7]',
            className,
          )}
        >
          <MoreHorizontal className="h-[18px] w-[18px]" />
        </button>
      </DM.Trigger>
      <DM.Portal>
        <DM.Content
          align="end"
          sideOffset={4}
          collisionPadding={12}
          onClick={(e) => e.stopPropagation()}
          className="z-[60] min-w-[230px] rounded-2xl border border-line bg-white p-1.5 shadow-soft data-[state=open]:animate-[dropIn_140ms_ease-out]"
        >
          {withOpen && (
            <DM.Item className={itemCls} onSelect={() => openDetails(task)}>
              <Eye className="h-4 w-4 text-ink-muted" /> Открыть
            </DM.Item>
          )}
          <DM.Item className={itemCls} onSelect={() => openEdit(task)}>
            <Pencil className="h-4 w-4 text-ink-muted" /> Редактировать
          </DM.Item>
          <DM.Separator className="my-1 h-px bg-line" />
          <DM.Label className="px-2.5 pb-1 pt-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint">Статус</DM.Label>
          {STATUS_ITEMS.map(({ status, icon: Icon, tone }) => (
            <DM.Item key={status} className={itemCls} onSelect={() => void setStatus(task, status)}>
              <Icon className={cn('h-4 w-4', tone)} />
              {status}
              {task.status === status && <Check className="ml-auto h-4 w-4 text-rose-500" aria-label="текущий" />}
            </DM.Item>
          ))}
          <DM.Item
            className={itemCls}
            disabled={task.status === 'Не требуется'}
            onSelect={() => void setStatus(task, 'Не требуется')}
          >
            <Ban className="h-4 w-4 text-ink-muted" />
            Не требуется…
            {task.conditional && <span className="ml-auto rounded-md bg-lilac-50 px-1.5 text-[11px] text-lilac-500">условная</span>}
            {task.status === 'Не требуется' && <Check className="ml-auto h-4 w-4 text-rose-500" />}
          </DM.Item>
          <DM.Separator className="my-1 h-px bg-line" />
          <DM.Item className={itemCls} onSelect={() => openHistory(task.uid)}>
            <History className="h-4 w-4 text-ink-muted" /> История задачи
          </DM.Item>
          <DM.Item
            className={cn(itemCls, 'text-[#D93A3F] data-[highlighted]:bg-[#FDECEC]')}
            onSelect={() => requestDelete(task)}
          >
            <Trash2 className="h-4 w-4" /> Удалить…
          </DM.Item>
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
