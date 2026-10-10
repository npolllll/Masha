import { Crosshair } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { addDays, daysBetween, formatDM, formatDMY, fromEpochDay, isoToDate, minISO, toEpochDay } from '@/domain/dates';
import { relativeDeadlineLabel } from '@/domain/deadlines';
import type { ISODate, Task } from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Fields';
import { Tooltip } from '@/components/ui/Misc';
import { cn } from '@/components/ui/cn';
import type { StageGroup } from './StageListView';

type Zoom = 'week' | 'month';
const ROW_H = 40;
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function mondayOnOrBefore(iso: ISODate): ISODate {
  const dow = (isoToDate(iso).getDay() + 6) % 7;
  return addDays(iso, -dow);
}

export function GanttView({ groups }: { groups: StageGroup[] }) {
  const { today, settings, openDetails } = useApp();
  const [zoom, setZoom] = useState<Zoom>(() => (typeof window !== 'undefined' && window.innerWidth < 640 ? 'month' : 'week'));
  const dayW = zoom === 'week' ? 16 : 4.2;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [labelW, setLabelW] = useState(280);

  useEffect(() => {
    const update = () => setLabelW(window.innerWidth < 640 ? 150 : 280);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const allTasks = groups.flatMap((g) => g.tasks);
  const range = useMemo(() => {
    const starts = [settings.planStart, ...allTasks.map((t) => t.startDate)];
    const ends = [settings.deadline, ...allTasks.map((t) => t.dueDate)];
    const start = mondayOnOrBefore(addDays(minISO(starts) ?? settings.planStart, -3));
    const end = addDays(ends.reduce((m, v) => (v > m ? v : m)), 10);
    return { start, end, days: daysBetween(start, end) + 1 };
  }, [allTasks, settings.planStart, settings.deadline]);

  const x = (iso: ISODate) => daysBetween(range.start, iso) * dayW;
  const width = range.days * dayW;

  const months = useMemo(() => {
    const res: { label: string; left: number; width: number }[] = [];
    let cur = range.start;
    while (cur <= range.end) {
      const d = isoToDate(cur);
      const next = `${d.getMonth() === 11 ? d.getFullYear() + 1 : d.getFullYear()}-${String(d.getMonth() === 11 ? 1 : d.getMonth() + 2).padStart(2, '0')}-01`;
      const segEnd = next > range.end ? addDays(range.end, 1) : next;
      res.push({ label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, left: x(cur), width: daysBetween(cur, segEnd) * dayW });
      cur = next;
    }
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, dayW]);

  const weeks = useMemo(() => {
    const res: ISODate[] = [];
    for (let e = toEpochDay(range.start); e <= toEpochDay(range.end); e += 7) res.push(fromEpochDay(e));
    return res;
  }, [range]);

  const scrollToToday = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, x(today) - 160), behavior: 'smooth' });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = Math.max(0, x(today) - 160);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  const todayIn = today >= range.start && today <= range.end;
  const lines = [
    ...(todayIn ? [{ left: x(today) + dayW / 2, cls: 'bg-rose-500 w-[2px]', label: 'Сегодня', tag: 'bg-rose-500 text-white' }] : []),
    { left: x(settings.submitTarget) + dayW / 2, cls: 'border-l-2 border-dashed border-amber-400 w-0', label: formatDM(settings.submitTarget), tag: 'bg-amber-50 text-amber-600' },
    { left: x(settings.deadline) + dayW / 2, cls: 'bg-[#E5484D] w-[2px]', label: `${formatDM(settings.deadline)} дедлайн`, tag: 'bg-[#FDECEC] text-[#D93A3F]' },
  ];

  if (!allTasks.length) {
    return <div className="card p-10 text-center text-[14px] text-ink-muted">Нет задач под выбранные фильтры.</div>;
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-[2px] bg-rose-500" /> Сегодня
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-[2px] bg-[#E5484D]" /> {formatDMY(settings.deadline)} — общий дедлайн
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 border-l-2 border-dashed border-amber-400" /> {formatDMY(settings.submitTarget)} — отправка
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-ink-faint" /> веха (1 день)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={scrollToToday}>
            <Crosshair className="h-4 w-4" /> К сегодня
          </Button>
          <Segmented
            size="sm"
            label="Масштаб"
            value={zoom}
            onChange={setZoom}
            options={[
              { value: 'week', label: 'Недели' },
              { value: 'month', label: 'Месяцы' },
            ]}
          />
        </div>
      </div>

      <div ref={scrollRef} className="relative max-h-[72vh] overflow-auto scrollbar-thin" tabIndex={0} aria-label="Диаграмма Ганта, прокрутка по горизонтали">
        <div className="relative" style={{ width: labelW + width }}>
          {/* шапка */}
          <div className="sticky top-0 z-30 flex border-b border-line bg-white">
            <div className="sticky left-0 z-40 flex shrink-0 items-end border-r border-line bg-white px-4 pb-2 text-[12px] font-semibold text-ink-muted" style={{ width: labelW }}>
              Этап / задача
            </div>
            <div className="relative h-[58px]" style={{ width }}>
              {months.map((m) => (
                <div key={m.left} className="absolute top-0 h-7 truncate border-l border-line px-2 pt-1.5 text-[12px] font-semibold text-ink-soft" style={{ left: m.left, width: m.width }}>
                  {m.width > 60 ? m.label : m.label.slice(0, 3)}
                </div>
              ))}
              {zoom === 'week' &&
                weeks.map((w) => (
                  <div key={w} className="absolute top-7 h-[30px] border-l border-line/70 pl-1 pt-1.5 text-[10.5px] tabular-nums text-ink-faint" style={{ left: x(w) }}>
                    {formatDM(w)}
                  </div>
                ))}
              {lines.map((l) => (
                <span key={l.label} className={cn('absolute bottom-1 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-bold', l.tag)} style={{ left: l.left }}>
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          {/* вертикальные линии */}
          <div aria-hidden className="pointer-events-none absolute bottom-0 top-[58px] z-10" style={{ left: labelW, width }}>
            {zoom === 'week'
              ? weeks.map((w) => <span key={w} className="absolute inset-y-0 w-px bg-line/50" style={{ left: x(w) }} />)
              : months.map((m) => <span key={m.left} className="absolute inset-y-0 w-px bg-line/70" style={{ left: m.left }} />)}
            {lines.map((l) => (
              <span key={l.label} className={cn('absolute inset-y-0 -translate-x-1/2', l.cls)} style={{ left: l.left }} />
            ))}
          </div>

          {groups.map((g) => {
            const s = g.stats;
            return (
              <div key={s.stage.id} role="rowgroup">
                <div className="flex border-b border-line bg-[#F7F8FB]" style={{ height: ROW_H + 4 }}>
                  <div className="sticky left-0 z-20 flex shrink-0 items-center gap-2.5 border-r border-line bg-[#F7F8FB] px-4" style={{ width: labelW }}>
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: s.stage.color }}>
                      {s.stage.id}
                    </span>
                    <span className="min-w-0 truncate text-[13px] font-bold text-ink">{s.stage.title}</span>
                    <span className="ml-auto text-[12px] font-semibold tabular-nums text-ink-muted">{s.pct}%</span>
                  </div>
                  <div className="relative z-20" style={{ width }}>
                    {s.startDate && s.endDate && (
                      <Tooltip
                        content={
                          <span>
                            <b>Этап {s.stage.id}. {s.stage.title}</b>
                            <br />
                            {formatDMY(s.startDate)} → {formatDMY(s.endDate)} · {s.done}/{s.applicable} ({s.pct}%)
                          </span>
                        }
                      >
                        <div
                          className="absolute top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full"
                          style={{ left: x(s.startDate), width: (daysBetween(s.startDate, s.endDate) + 1) * dayW, background: `${s.stage.color}26` }}
                        >
                          <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.stage.color }} />
                        </div>
                      </Tooltip>
                    )}
                  </div>
                </div>
                {g.tasks.map((t) => (
                  <GanttRow key={t.uid} task={t} labelW={labelW} width={width} x={x} dayW={dayW} color={s.stage.color} today={today} onOpen={() => openDetails(t)} />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GanttRow({
  task,
  labelW,
  width,
  x,
  dayW,
  color,
  today,
  onOpen,
}: {
  task: Task;
  labelW: number;
  width: number;
  x: (iso: ISODate) => number;
  dayW: number;
  color: string;
  today: ISODate;
  onOpen: () => void;
}) {
  const done = task.status === 'Готово';
  const skipped = task.status === 'Не требуется';
  const overdue = !done && !skipped && task.dueDate < today;
  const milestone = task.startDate === task.dueDate;
  const left = x(task.startDate);
  const w = Math.max((daysBetween(task.startDate, task.dueDate) + 1) * dayW, 6);
  const tip = (
    <span>
      <b>
        {task.id} {task.title}
      </b>
      <br />
      {formatDMY(task.startDate)} → {formatDMY(task.dueDate)} · {task.assignee}
      <br />
      {task.deadlineType} · {task.status} · {relativeDeadlineLabel(task, today)}
    </span>
  );
  return (
    <div className="flex border-b border-line/60 hover:bg-[#FAFBFC]" style={{ height: ROW_H }}>
      <button
        type="button"
        onClick={onOpen}
        className="sticky left-0 z-20 flex shrink-0 items-center gap-2 border-r border-line bg-white px-4 text-left hover:text-rose-600"
        style={{ width: labelW }}
      >
        <span className="w-8 shrink-0 text-[12px] tabular-nums text-ink-muted">{task.id}</span>
        <span className={cn('truncate text-[12.5px]', done ? 'text-ink-muted' : skipped ? 'text-ink-faint line-through' : 'text-ink')}>{task.title}</span>
      </button>
      <div className="relative z-20" style={{ width }}>
        <Tooltip content={tip}>
          <button
            type="button"
            onClick={onOpen}
            aria-label={`${task.id} ${task.title}: ${formatDMY(task.startDate)} – ${formatDMY(task.dueDate)}`}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 transition hover:brightness-95',
              milestone ? 'h-3.5 w-3.5 rotate-45 rounded-[3px]' : 'h-[18px] rounded-md',
              skipped && 'stripes bg-[#EEF0F4]',
              task.deadlineType === 'Ориентир' && !done && !skipped && 'opacity-70',
            )}
            style={{
              left: milestone ? left + dayW / 2 - 7 : left,
              width: milestone ? undefined : w,
              background: skipped ? undefined : done ? '#20C997' : color,
              boxShadow: overdue
                ? '0 0 0 2px #fff, 0 0 0 4px #E5484D'
                : task.deadlineType === 'Жёсткий' && !done
                  ? `0 0 0 2px #fff, 0 0 0 3.5px ${color}`
                  : undefined,
            }}
          />
        </Tooltip>
        {!milestone && w > 70 && (
          <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 truncate px-2 text-[10.5px] font-semibold text-white" style={{ left, maxWidth: w }}>
            {formatDM(task.startDate)}–{formatDM(task.dueDate)}
          </span>
        )}
      </div>
    </div>
  );
}
