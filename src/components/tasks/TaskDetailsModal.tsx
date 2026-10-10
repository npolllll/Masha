import { CalendarDays, Flag, History, Pencil, Trash2, User } from 'lucide-react';
import type { ReactNode } from 'react';
import { useApp } from '@/context/AppContext';
import { daysBetween, formatDateTime, formatLong, pluralDays } from '@/domain/dates';
import { MAIN_STATUSES } from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { DeadlineChip, DeadlineTypeBadge, StatusBadge } from '@/components/ui/Badges';
import { Segmented } from '@/components/ui/Fields';
import { Modal } from '@/components/ui/Modal';

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#F4F5F8] text-ink-muted">{icon}</span>
      <div className="min-w-0">
        <p className="text-[12px] text-ink-muted">{label}</p>
        <div className="text-[14px] font-medium text-ink">{children}</div>
      </div>
    </div>
  );
}

export function TaskDetailsModal() {
  const { detailsUid, closeDetails, allTasks, stages, today, setStatus, openEdit, requestDelete, openHistory, settings, restoreTask } = useApp();
  const task = allTasks.find((t) => t.uid === detailsUid) ?? null;
  const stage = stages.find((s) => s.id === task?.stageId);
  return (
    <Modal
      open={Boolean(task)}
      onOpenChange={(o) => !o && closeDetails()}
      title={
        task ? (
          <span className="flex items-start gap-2.5">
            <span className="mt-0.5 shrink-0 rounded-lg bg-rose-50 px-2 py-0.5 text-[14px] font-bold text-rose-600">{task.id}</span>
            <span>{task.title}</span>
          </span>
        ) : (
          ''
        )
      }
      description={stage ? `Этап ${stage.id}. ${stage.title}` : undefined}
      className="max-w-[560px]"
      footer={
        task && !task.deletedAt ? (
          <>
            <Button variant="ghost" className="mr-auto" onClick={() => openHistory(task.uid)}>
              <History className="h-4 w-4" /> История
            </Button>
            <Button variant="ghost" className="text-[#D93A3F] hover:bg-[#FDECEC]" onClick={() => requestDelete(task)}>
              <Trash2 className="h-4 w-4" /> Удалить
            </Button>
            <Button onClick={() => openEdit(task)}>
              <Pencil className="h-4 w-4" /> Редактировать
            </Button>
          </>
        ) : task ? (
          <Button onClick={() => void restoreTask(task.uid)}>Восстановить задачу</Button>
        ) : null
      }
    >
      {task && (
        <div className="space-y-4 pb-2">
          {task.deletedAt && (
            <p className="rounded-xl bg-[#FDECEC] px-3 py-2 text-[13px] text-[#C22F34]">
              Задача удалена {formatDateTime(task.deletedAt, settings.timezone)}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <DeadlineTypeBadge type={task.deadlineType} />
            <DeadlineChip task={task} today={today} />
            {task.conditional && (
              <span className="rounded-md bg-lilac-50 px-2 py-1 text-[11.5px] font-medium text-lilac-500">Условная задача</span>
            )}
          </div>

          {!task.deletedAt && (
            <div>
              <p className="mb-2 text-[12px] font-medium text-ink-muted">Изменить статус</p>
              <Segmented
                label="Статус задачи"
                value={task.status}
                onChange={(s) => void setStatus(task, s)}
                options={[...MAIN_STATUSES, 'Не требуется' as const].map((s) => ({ value: s, label: s }))}
                className="flex w-full flex-wrap"
                size="sm"
              />
            </div>
          )}

          <div className="divide-y divide-line rounded-2xl border border-line px-4">
            <Row icon={<CalendarDays className="h-4 w-4" />} label="Период">
              {formatLong(task.startDate)} → {formatLong(task.dueDate)}
              <span className="ml-1 font-normal text-ink-muted">
                ({pluralDays(daysBetween(task.startDate, task.dueDate) + 1)})
              </span>
            </Row>
            <Row icon={<User className="h-4 w-4" />} label="Владелец">
              {task.assignee}
            </Row>
            {task.result && (
              <Row icon={<Flag className="h-4 w-4" />} label="Ожидаемый результат (Excel)">
                {task.result}
              </Row>
            )}
          </div>

          {task.description ? (
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Описание</p>
              <p className="whitespace-pre-wrap rounded-2xl bg-[#F7F8FB] px-4 py-3 text-[14px] leading-relaxed text-ink-soft">
                {task.description}
              </p>
            </div>
          ) : null}

          <p className="text-[12px] text-ink-faint">
            {task.source === 'excel' ? 'Источник: исходный Excel-трекер' : 'Создана в приложении'} · обновлена{' '}
            {formatDateTime(task.updatedAt, settings.timezone)}
            {task.completedAt && ` · выполнена ${formatDateTime(task.completedAt, settings.timezone)}`}
          </p>
        </div>
      )}
    </Modal>
  );
}
