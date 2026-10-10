import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, CirclePlus, History, Pencil, RefreshCcw, RotateCcw, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatDMY, isValidISODate } from '@/domain/dates';
import { compareTaskIds } from '@/domain/ids';
import { TASK_FIELD_LABELS } from '@/domain/types';
import type { TaskEvent, TaskEventType } from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Fields';
import { EmptyState } from '@/components/ui/Misc';
import { cn } from '@/components/ui/cn';

const TYPE_META: Record<TaskEventType, { label: string; icon: typeof History; tone: string }> = {
  created: { label: 'Создана', icon: CirclePlus, tone: 'bg-mint-50 text-mint-600' },
  updated: { label: 'Изменена', icon: Pencil, tone: 'bg-lilac-50 text-lilac-500' },
  statusChanged: { label: 'Статус', icon: RefreshCcw, tone: 'bg-amber-50 text-amber-600' },
  deleted: { label: 'Удалена', icon: Trash2, tone: 'bg-[#FDECEC] text-[#D93A3F]' },
  restored: { label: 'Восстановлена', icon: RotateCcw, tone: 'bg-rose-50 text-rose-600' },
};

function fmtValue(field: string, v: unknown, stageTitle: (id: number) => string): string {
  if (v === null || v === undefined || v === '') return '—';
  if (field === 'stageId' && typeof v === 'number') return stageTitle(v);
  if (typeof v === 'boolean') return v ? 'да' : 'нет';
  if (typeof v === 'string' && isValidISODate(v)) return formatDMY(v);
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString('ru-RU');
  return String(v);
}

function dayKey(at: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', { timeZone: tz, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(at));
  } catch {
    return new Date(at).toLocaleDateString('ru-RU');
  }
}

function timeOf(at: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(new Date(at));
  } catch {
    return new Date(at).toLocaleTimeString('ru-RU');
  }
}

export function HistoryDrawer() {
  const { history, closeHistory, events, allTasks, stages, restoreTask, settings, openDetails } = useApp();
  const [filter, setFilter] = useState<string>('all');
  useEffect(() => {
    if (history) setFilter(history.taskUid ?? 'all');
  }, [history]);

  const stageTitle = (id: number) => `Этап ${id}${stages[id] ? ` · ${stages[id].shortTitle}` : ''}`;
  const taskOptions = useMemo(() => {
    const seen = new Map<string, { uid: string; id: string; title: string }>();
    for (const e of events) if (!seen.has(e.taskUid)) seen.set(e.taskUid, { uid: e.taskUid, id: e.taskId, title: e.taskTitle });
    return [...seen.values()].sort((a, b) => compareTaskIds(a.id, b.id));
  }, [events]);

  const filtered = filter === 'all' ? events : events.filter((e) => e.taskUid === filter);
  const groups = useMemo(() => {
    const map = new Map<string, TaskEvent[]>();
    for (const e of filtered) {
      const k = dayKey(e.at, settings.timezone);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()];
  }, [filtered, settings.timezone]);

  const byUid = new Map(allTasks.map((t) => [t.uid, t]));

  return (
    <Dialog.Root open={Boolean(history)} onOpenChange={(o) => !o && closeHistory()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#1b2234]/25 backdrop-blur-[3px] data-[state=open]:animate-[fadeIn_160ms_ease-out]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col bg-white shadow-float outline-none data-[state=open]:animate-[slideInRight_240ms_cubic-bezier(.2,.8,.2,1)]">
          <div className="flex items-center justify-between border-b border-line px-6 py-5">
            <div>
              <Dialog.Title className="flex items-center gap-2 text-[18px] font-bold text-ink">
                <History className="h-5 w-5 text-rose-500" /> История изменений
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-[13px] text-ink-muted">
                Создание, правки, смена статусов, удаление и восстановление задач
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Закрыть" className="grid h-9 w-9 place-items-center rounded-xl text-ink-muted hover:bg-[#F2F3F7]">
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="border-b border-line px-6 py-3">
            <SelectField value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Фильтр по задаче">
              <option value="all">Все задачи ({events.length})</option>
              {taskOptions.map((t) => (
                <option key={t.uid} value={t.uid}>
                  {t.id} {t.title.length > 60 ? `${t.title.slice(0, 60)}…` : t.title}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 scrollbar-thin" aria-live="polite">
            {groups.length === 0 ? (
              <EmptyState icon={<History className="h-6 w-6" />} title="Пока нет изменений">
                Здесь появятся записи, когда вы отметите задачу, измените её, добавите или удалите. Исходные статусы из Excel
                не считаются событиями.
              </EmptyState>
            ) : (
              groups.map(([day, list]) => (
                <section key={day} className="mb-5">
                  <h3 className="sticky top-0 z-10 -mx-1 mb-2 bg-white/95 px-1 py-1 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                    {day}
                  </h3>
                  <ol className="space-y-2.5">
                    {list.map((e) => {
                      const meta = TYPE_META[e.type];
                      const Icon = meta.icon;
                      const task = byUid.get(e.taskUid);
                      const canRestore = e.type === 'deleted' && task?.deletedAt;
                      return (
                        <li key={e.id} className="rounded-2xl border border-line p-3.5">
                          <div className="flex items-start gap-3">
                            <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-xl', meta.tone)}>
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[12.5px] font-semibold text-ink-soft">{meta.label}</span>
                                <time dateTime={e.at} className="text-[12px] text-ink-faint">
                                  {timeOf(e.at, settings.timezone)}
                                </time>
                              </div>
                              <button
                                type="button"
                                disabled={!task}
                                onClick={() => task && openDetails(task)}
                                className="mt-0.5 block text-left text-[13.5px] font-medium text-ink hover:text-rose-600 disabled:hover:text-ink"
                              >
                                <span className="text-rose-600">{e.taskId}</span> {e.taskTitle}
                              </button>
                              {e.changes.length > 0 && e.type !== 'deleted' && e.type !== 'restored' && (
                                <ul className="mt-2 space-y-1">
                                  {e.changes.map((c, i) => (
                                    <li key={i} className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-muted">
                                      <span>{TASK_FIELD_LABELS[c.field] ?? c.field}:</span>
                                      {e.type !== 'created' && (
                                        <>
                                          <span className="rounded bg-[#F4F5F8] px-1.5 line-through decoration-ink-faint">
                                            {fmtValue(c.field, c.from, stageTitle)}
                                          </span>
                                          <ArrowRight className="h-3 w-3" />
                                        </>
                                      )}
                                      <span className="rounded bg-rose-50 px-1.5 text-ink">{fmtValue(c.field, c.to, stageTitle)}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {canRestore && (
                                <Button size="sm" variant="soft" className="mt-2.5" onClick={() => void restoreTask(e.taskUid)}>
                                  <RotateCcw className="h-3.5 w-3.5" /> Отменить удаление
                                </Button>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
