import { AlertTriangle, ArrowRight, CalendarCheck2, ChevronRight, Info, Quote, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { formatShort, formatShortYear, plural } from '@/domain/dates';
import { upcomingTasks, dueWithin, overdueTasks } from '@/domain/deadlines';
import { focusStageId } from '@/domain/progress';
import { buildDailySummary, type SummaryTone } from '@/domain/summary';
import { ArchScene, SkyScene } from '@/components/illustrations/Scenes';
import { CountBadge, DeadlineChip, DeadlineTypeBadge, StatusBadge } from '@/components/ui/Badges';
import { TaskCheckbox } from '@/components/ui/Checkbox';
import { EmptyState, Tooltip } from '@/components/ui/Misc';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { cn } from '@/components/ui/cn';

const TONE_ICON: Record<SummaryTone, string> = {
  alert: 'bg-[#FDECEC] text-[#D93A3F]',
  warm: 'bg-rose-50 text-rose-500',
  calm: 'bg-lilac-100 text-lilac-500',
  done: 'bg-mint-50 text-mint-600',
};

export function SummaryCard() {
  const { tasks, today, openDetails } = useApp();
  const navigate = useNavigate();
  const summary = useMemo(() => buildDailySummary(tasks, today), [tasks, today]);
  const top = summary.facts[0];
  const rest = summary.facts.slice(1);
  const primary = summary.primaryTask;
  const Icon = summary.tone === 'alert' ? AlertTriangle : summary.tone === 'done' ? Sparkles : CalendarCheck2;

  return (
    <section
      aria-labelledby="summary-title"
      className="relative overflow-hidden rounded-[22px] border border-[#E6E6FB] bg-gradient-to-br from-[#EEF0FE] via-[#F2F1FD] to-[#F7F0FA] p-6 sm:p-7"
    >
      <SkyScene className="pointer-events-none absolute -right-4 -top-2 hidden h-[210px] w-[34%] max-w-[300px] opacity-90 sm:block" />
      <div className="relative z-10 flex gap-4 sm:gap-5">
        <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', TONE_ICON[summary.tone])}>
          <Icon className="h-[22px] w-[22px]" />
        </span>
        <div className="min-w-0 flex-1 pr-0 sm:pr-40 xl:pr-48">
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-muted">Сводка на сегодня</p>
          <h2 id="summary-title" aria-live="polite" className="mt-1 text-[18px] font-bold leading-snug text-ink sm:text-[19px]">
            {summary.headline}
          </h2>

          {top ? (
            <>
              <p className="mt-3 text-[13.5px] text-ink-muted">{top.label}:</p>
              <p className="mt-1 flex items-start gap-1.5 text-[14.5px] text-ink-soft">
                <span className="line-clamp-2">{top.detail}</span>
                {top.primary.result && (
                  <Tooltip content={`Результат: ${top.primary.result} · ${top.primary.assignee}`}>
                    <button type="button" aria-label="Подробнее о задаче" className="mt-0.5 shrink-0 text-ink-faint hover:text-ink-soft">
                      <Info className="h-4 w-4" />
                    </button>
                  </Tooltip>
                )}
              </p>
            </>
          ) : primary ? (
            <>
              <p className="mt-3 text-[13.5px] text-ink-muted">Ближайшая задача:</p>
              <p className="mt-1 text-[14.5px] text-ink-soft">
                {primary.id} {primary.title}
              </p>
            </>
          ) : null}

          {primary && summary.primaryDate && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openDetails(primary)}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white px-4 text-[13.5px] font-semibold text-rose-600 shadow-[0_2px_10px_rgba(255,45,112,0.12)] transition hover:shadow-[0_4px_14px_rgba(255,45,112,0.2)]"
              >
                {formatShortYear(summary.primaryDate)}
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/tasks')}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-semibold text-ink-soft transition hover:bg-white/70 hover:text-ink"
              >
                Посмотреть задачи <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {rest.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-[#E3E2F7] pt-3.5">
              {rest.map((f) => (
                <li key={f.key} className="flex items-start gap-2.5 text-[13px] leading-snug">
                  <span
                    aria-hidden
                    className={cn(
                      'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                      f.tone === 'alert' ? 'bg-[#D93A3F]' : f.tone === 'warm' ? 'bg-rose-400' : 'bg-lilac-500',
                    )}
                  />
                  <button type="button" onClick={() => openDetails(f.primary)} className="text-left text-ink-soft hover:text-ink">
                    <span className="font-semibold text-ink">{f.label}</span> · {f.detail}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export function ProgressOverview() {
  const { overall } = useApp();
  return (
    <section aria-label="Общий прогресс" className="card flex flex-col items-center justify-between px-5 py-6">
      <ProgressRing value={overall.ratio} size={148} stroke={15} label={`Выполнено ${overall.pct}%`}>
        <div>
          <p className="text-[30px] font-bold leading-none tracking-tight text-ink">{overall.pct}%</p>
          <p className="mt-1.5 text-[12.5px] text-ink-muted">выполнено</p>
        </div>
      </ProgressRing>
      <p className="mt-3 text-[12.5px] text-ink-muted">
        {overall.done} из {overall.applicable} {plural(overall.applicable, ['задачи', 'задач', 'задач'])} готово
        {overall.skipped > 0 && ` · ${overall.skipped} не требуется`}
      </p>
      <dl className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
        <div>
          <dd className="text-[22px] font-bold text-ink">{overall.stagesTotal}</dd>
          <dt className="text-[11.5px] text-ink-muted">{plural(overall.stagesTotal, ['этап', 'этапа', 'этапов'])}</dt>
        </div>
        <div>
          <dd className="text-[22px] font-bold text-ink">{overall.total}</dd>
          <dt className="text-[11.5px] text-ink-muted">{plural(overall.total, ['задача', 'задачи', 'задач'])}</dt>
        </div>
        <div>
          <dd className="text-[22px] font-bold text-ink">{overall.hardTotal}</dd>
          <dt className="text-[11.5px] leading-tight text-ink-muted">жёстких сроков</dt>
        </div>
      </dl>
    </section>
  );
}

export function StageStrip() {
  const { stageStats } = useApp();
  const focus = focusStageId(stageStats);
  return (
    <section aria-label="Этапы" className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-9 lg:gap-3">
      {stageStats.map((s) => {
        const isFocus = s.stage.id === focus;
        const closed = s.status === 'Закрыт';
        const progressed = s.done > 0;
        return (
          <Link
            key={s.stage.id}
            to={`/tasks?stage=${s.stage.id}`}
            aria-label={`Этап ${s.stage.id}. ${s.stage.title}: ${s.done} из ${s.applicable}, ${s.pct}%. Открыть задачи этапа`}
            className={cn(
              'group flex min-h-[124px] flex-col rounded-2xl border p-3.5 transition duration-150 hover:-translate-y-0.5 hover:shadow-card',
              isFocus
                ? 'border-rose-300 bg-rose-50/70 shadow-[0_0_0_3px_rgba(255,45,112,0.08)]'
                : closed
                  ? 'border-mint-100 bg-mint-50'
                  : progressed
                    ? 'border-mint-100 bg-gradient-to-b from-[#F1FCF8] to-white'
                    : 'border-line bg-white',
            )}
          >
            <span
              className={cn(
                'grid h-7 w-7 place-items-center rounded-lg text-[15px] font-bold',
                isFocus ? 'bg-rose-500 text-white' : progressed || closed ? 'bg-mint-100 text-mint-600' : 'bg-[#F2F3F7] text-ink-muted',
              )}
            >
              {s.stage.id}
            </span>
            <span className="mt-2.5 truncate text-[13px] font-medium text-ink" title={s.stage.title}>
              {s.stage.shortTitle}
            </span>
            <span className={cn('mt-1 text-[13px] font-semibold', progressed ? 'text-ink' : 'text-ink-muted')}>
              {s.done} / {s.applicable}
            </span>
            <span className="mt-auto pt-2.5">
              {s.done === 0 ? (
                <span className="inline-flex h-5 items-center rounded-md bg-[#F2F3F7] px-1.5 text-[11px] font-medium text-ink-muted">0%</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <ProgressBar value={s.ratio} tone="green" height={6} label={`Этап ${s.stage.id}`} />
                  <span className="text-[11px] font-semibold text-mint-600">{s.pct}%</span>
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </section>
  );
}

export function UpcomingTasks() {
  const { tasks, today, stages, toggleDone, openDetails } = useApp();
  const list = useMemo(() => upcomingTasks(tasks, today, 3, 5), [tasks, today]);
  const count = useMemo(() => dueWithin(tasks, today, 14).length + overdueTasks(tasks, today).length, [tasks, today]);
  const stageMap = new Map(stages.map((s) => [s.id, s]));
  return (
    <section aria-labelledby="upcoming-title" className="card p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="upcoming-title" className="flex items-center gap-2.5 text-[16px] font-bold text-ink">
          Ближайшие задачи
          <Tooltip content="Открытые задачи с дедлайном в ближайшие 14 дней (включая просроченные)">
            <span tabIndex={0}>
              <CountBadge>{count}</CountBadge>
            </span>
          </Tooltip>
        </h2>
        <Link to="/tasks" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-rose-600 hover:text-rose-700">
          Смотреть все <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-6 w-6" />} title="Все задачи выполнены">
          Открытых задач не осталось. Можно выдохнуть 🌷
        </EmptyState>
      ) : (
        <ul className="divide-y divide-line">
          {list.map((t) => {
            const st = stageMap.get(t.stageId);
            const overdue = t.dueDate < today;
            return (
              <li key={t.uid} className="flex items-center gap-3 py-3 sm:gap-4">
                <span
                  className={cn(
                    'grid h-11 w-[74px] shrink-0 place-items-center rounded-xl border text-[14.5px] font-bold',
                    overdue ? 'border-[#F6C3C5] bg-[#FDECEC] text-[#D93A3F]' : 'border-rose-200 bg-rose-50 text-rose-600',
                  )}
                >
                  {formatShort(t.dueDate)}
                </span>
                <button type="button" onClick={() => openDetails(t)} className="min-w-0 flex-1 border-l border-line pl-3 text-left sm:pl-4">
                  <span className="line-clamp-1 text-[14px] font-medium text-ink hover:text-rose-600">{t.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-ink-muted">
                    <span>
                      Этап {t.stageId} · {st?.shortTitle}
                    </span>
                    <span>· {t.assignee}</span>
                    {t.deadlineType === 'Жёсткий' && <DeadlineTypeBadge type={t.deadlineType} className="h-5" />}
                    {t.status === 'В работе' && <StatusBadge status={t.status} className="h-5" />}
                  </span>
                </button>
                <DeadlineChip task={t} today={today} className="hidden min-w-0 md:inline-flex" />
                <TaskCheckbox checked={t.status === 'Готово'} onToggle={() => void toggleDone(t)} label={`Отметить «${t.title}» выполненной`} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function InspirationCard() {
  const { overall } = useApp();
  return (
    <section
      aria-label="Вдохновение"
      className="relative min-h-[240px] overflow-hidden rounded-[22px] bg-gradient-to-br from-[#F7E6F3] via-[#EEDFF6] to-[#F3D9E2] p-6 sm:p-7"
    >
      <ArchScene className="pointer-events-none absolute bottom-0 right-0 h-full w-[68%]" />
      <div className="relative z-10 max-w-[230px]">
        <Quote className="h-7 w-7 fill-ink-faint/40 text-ink-faint/60" aria-hidden />
        <p className="mt-3 text-[17px] font-semibold leading-snug text-ink">
          Большое путешествие начинается с небольших, но уверенных шагов.
        </p>
        <p className="mt-4 inline-flex rounded-full bg-white/70 px-3 py-1.5 text-[12.5px] font-medium text-ink-soft backdrop-blur">
          Уже позади: {overall.done} {plural(overall.done, ['шаг', 'шага', 'шагов'])} из {overall.applicable}
        </p>
      </div>
    </section>
  );
}
