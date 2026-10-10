import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';
import { Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { dateToISO, formatLong, formatMonthYear, isoToDate, pluralTasks } from '@/domain/dates';
import { sortByDue } from '@/domain/deadlines';
import type { ISODate, Task } from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { DeadlineChip, StatusBadge } from '@/components/ui/Badges';
import { EmptyState } from '@/components/ui/Misc';
import { cn } from '@/components/ui/cn';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MAX_IN_CELL = 3;

export function CalendarView({ tasks, initialMonth }: { tasks: Task[]; initialMonth?: ISODate }) {
  const { today, settings, stages, openDetails, openCreate } = useApp();
  const [month, setMonth] = useState(() => startOfMonth(isoToDate(initialMonth ?? today)));
  const [selected, setSelected] = useState<ISODate | null>(null);
  useEffect(() => {
    if (initialMonth) setMonth(startOfMonth(isoToDate(initialMonth)));
  }, [initialMonth]);

  const stageColor = useMemo(() => new Map(stages.map((s) => [s.id, s.color])), [stages]);
  const byDue = useMemo(() => {
    const map = new Map<ISODate, Task[]>();
    for (const t of [...tasks].sort(sortByDue)) map.set(t.dueDate, [...(map.get(t.dueDate) ?? []), t]);
    return map;
  }, [tasks]);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
      }).map(dateToISO),
    [month],
  );
  const monthKey = dateToISO(month).slice(0, 7);
  const monthCount = tasks.filter((t) => t.dueDate.startsWith(monthKey)).length;
  const selectedTasks = selected ? (byDue.get(selected) ?? []) : [];

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
        <div>
          <h3 className="text-[18px] font-bold capitalize text-ink" aria-live="polite">
            {formatMonthYear(month)}
          </h3>
          <p className="text-[12.5px] text-ink-muted">
            {monthCount ? `${pluralTasks(monthCount)} с дедлайном в этом месяце` : 'В этом месяце нет дедлайнов'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Предыдущий месяц" onClick={() => setMonth((m) => addMonths(m, -1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="secondary" onClick={() => setMonth(startOfMonth(isoToDate(today)))}>
            Сегодня
          </Button>
          <Button variant="outline" size="icon" aria-label="Следующий месяц" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div role="grid" aria-label={`Календарь дедлайнов, ${formatMonthYear(month)}`}>
        <div role="row" className="grid grid-cols-7 border-b border-line bg-[#FAFBFC]">
          {WEEKDAYS.map((d) => (
            <div key={d} role="columnheader" className="py-2.5 text-center text-[12px] font-semibold text-ink-muted">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((iso) => {
            const inMonth = iso.startsWith(monthKey);
            const list = byDue.get(iso) ?? [];
            const isToday = iso === today;
            const isDeadline = iso === settings.deadline;
            const isTarget = iso === settings.submitTarget;
            const weekend = [5, 6].includes((isoToDate(iso).getDay() + 6) % 7);
            return (
              <div
                key={iso}
                role="gridcell"
                aria-label={`${formatLong(iso)}${list.length ? `, ${pluralTasks(list.length)}` : ''}`}
                className={cn(
                  'relative min-h-[64px] border-b border-r border-line/80 p-1.5 sm:min-h-[118px] sm:p-2 [&:nth-child(7n)]:border-r-0',
                  !inMonth && 'bg-[#FAFBFC]',
                  weekend && inMonth && 'bg-[#FCFCFE]',
                  isDeadline && 'bg-[#FFF5F5]',
                  selected === iso && 'ring-2 ring-inset ring-rose-300',
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelected(selected === iso ? null : iso)}
                  className="flex w-full items-center justify-between gap-1 rounded-lg text-left"
                  aria-label={`Показать задачи на ${formatLong(iso)}`}
                >
                  <span
                    className={cn(
                      'grid h-7 min-w-7 place-items-center rounded-full px-1 text-[13px] font-semibold',
                      isToday ? 'bg-rose-500 text-white' : inMonth ? 'text-ink' : 'text-ink-faint',
                    )}
                  >
                    {isoToDate(iso).getDate()}
                  </span>
                  {list.length > 0 && (
                    <span className="flex gap-0.5 sm:hidden">
                      {list.slice(0, 3).map((t) => (
                        <span key={t.uid} className="h-1.5 w-1.5 rounded-full" style={{ background: t.status === 'Готово' ? '#20C997' : stageColor.get(t.stageId) }} />
                      ))}
                    </span>
                  )}
                </button>
                {(isDeadline || isTarget) && (
                  <span
                    className={cn(
                      'mt-1 block truncate rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold',
                      isDeadline ? 'bg-[#FDECEC] text-[#D93A3F]' : 'bg-amber-50 text-amber-600',
                    )}
                    title={isDeadline ? 'Общий дедлайн подачи (ориентир)' : 'Целевая дата отправки заявок'}
                  >
                    {isDeadline ? 'Общий дедлайн' : 'Отправка заявок'}
                  </span>
                )}
                <ul className="mt-1 hidden space-y-1 sm:block">
                  {list.slice(0, MAX_IN_CELL).map((t) => {
                    const done = t.status === 'Готово';
                    const overdue = !done && t.status !== 'Не требуется' && t.dueDate < today;
                    return (
                      <li key={t.uid}>
                        <button
                          type="button"
                          onClick={() => openDetails(t)}
                          title={`${t.id} ${t.title}`}
                          className={cn(
                            'flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-[11.5px] leading-tight transition hover:brightness-95',
                            done ? 'bg-mint-50 text-mint-600' : overdue ? 'bg-[#FDECEC] text-[#C22F34]' : 'bg-[#F4F5F8] text-ink-soft',
                            t.deadlineType === 'Жёсткий' && !done && 'ring-1 ring-inset ring-rose-200',
                          )}
                        >
                          {done ? (
                            <Check className="h-3 w-3 shrink-0" />
                          ) : (
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: stageColor.get(t.stageId) }} />
                          )}
                          <span className="truncate">
                            <b className="font-semibold">{t.id}</b> {t.title}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {list.length > MAX_IN_CELL && (
                    <li>
                      <button type="button" onClick={() => setSelected(iso)} className="px-1.5 text-[11.5px] font-semibold text-rose-600 hover:underline">
                        ещё {list.length - MAX_IN_CELL}
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-4 py-3 text-[12px] text-ink-muted sm:px-6">
        {stages.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.id} · {s.shortTitle}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-4 rounded ring-1 ring-inset ring-rose-200" /> жёсткий срок
        </span>
      </div>

      {selected && (
        <div className="border-t border-line bg-[#FCFCFD] px-4 py-4 sm:px-6" aria-live="polite">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-[14.5px] font-bold capitalize text-ink">{formatLong(selected)}</h4>
            <Button size="sm" variant="soft" onClick={() => openCreate({ dueDate: selected })}>
              <Plus className="h-4 w-4" /> Задача на эту дату
            </Button>
          </div>
          {selectedTasks.length === 0 ? (
            <EmptyState title="На эту дату дедлайнов нет" className="py-4" />
          ) : (
            <ul className="space-y-2">
              {selectedTasks.map((t) => (
                <li key={t.uid}>
                  <button
                    type="button"
                    onClick={() => openDetails(t)}
                    className="flex w-full flex-wrap items-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-left hover:border-rose-200"
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: stageColor.get(t.stageId) }} />
                    <span className="text-[13px] font-semibold text-ink-muted">{t.id}</span>
                    <span className="min-w-0 flex-1 text-[13.5px] font-medium text-ink">{t.title}</span>
                    <StatusBadge status={t.status} />
                    <DeadlineChip task={t} today={today} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
