import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { formatDM, formatDMY } from '@/domain/dates';
import { monthTicks, positionPct } from '@/domain/timeline';
import { StageStatusBadge } from '@/components/ui/Badges';
import { Tooltip } from '@/components/ui/Misc';
import { cn } from '@/components/ui/cn';

/** Полноширинная дорожная карта 9 этапов с реальными интервалами, «Сегодня» и 15.01. */
export function Roadmap() {
  const { stageStats, settings, today, planEnd, openDetails } = useApp();
  const minStart = stageStats.reduce((m, s) => (s.startDate && s.startDate < m ? s.startDate : m), settings.planStart);
  const end = planEnd;
  const ticks = monthTicks(minStart, end);
  const todayPos = positionPct(today, minStart, end);
  const deadlinePos = positionPct(settings.deadline, minStart, end);
  const targetPos = positionPct(settings.submitTarget, minStart, end);
  const showToday = today >= minStart && today <= end;

  return (
    <section aria-labelledby="roadmap-title" className="card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="roadmap-title" className="text-[16px] font-bold text-ink">
            Дорожная карта · 9 этапов
          </h2>
          <p className="mt-1 text-[13px] text-ink-muted">
            Реальные интервалы этапов: старт = самая ранняя задача, финиш = самый поздний дедлайн (как в Excel).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[12px] text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-[2px] rounded bg-rose-500" /> Сегодня
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-[2px] rounded bg-[#E5484D]" /> {formatDM(settings.deadline)} общий дедлайн
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-0 border-l-2 border-dashed border-amber-500" /> {formatDM(settings.submitTarget)} отправка заявок
          </span>
          <Link to="/tasks?view=gantt" className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700">
            Гантт <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="-mx-5 overflow-x-auto px-5 pb-1 scrollbar-thin sm:-mx-6 sm:px-6">
        <div className="relative min-w-[760px] sm:min-w-[880px]">
          {/* ось месяцев и подписи маркеров */}
          <div className="relative ml-[170px] h-12 border-b border-line sm:ml-[260px]">
            {showToday && (
              <span
                className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-md bg-rose-500 px-1.5 py-0.5 text-[10.5px] font-semibold text-white"
                style={{ left: `${todayPos}%` }}
              >
                Сегодня
              </span>
            )}
            <span
              className="absolute top-0 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#FDECEC] px-1.5 py-0.5 text-[10.5px] font-semibold text-[#D93A3F]"
              style={{ left: `${deadlinePos}%` }}
            >
              {formatDM(settings.deadline)} дедлайн
            </span>
            <span className="absolute bottom-1 text-[11.5px] font-medium text-ink-faint" style={{ left: 0 }}>
              {formatDM(minStart)}
            </span>
            {ticks.map((t) => (
              <span key={t.date} className="absolute bottom-1 -translate-x-1/2 text-[11.5px] font-medium text-ink-muted" style={{ left: `${t.pct}%` }}>
                {t.label}
                {t.month === 1 && <span className="ml-0.5 text-ink-faint">’{String(t.year).slice(2)}</span>}
              </span>
            ))}
          </div>

          <div className="relative">
            {/* сетка и вертикальные линии */}
            <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[170px] right-0 sm:left-[260px]">
              {ticks.map((t) => (
                <span key={t.date} className="absolute inset-y-0 w-px bg-line/70" style={{ left: `${t.pct}%` }} />
              ))}
              <span className="absolute inset-y-0 w-0 border-l-2 border-dashed border-amber-400/80" style={{ left: `${targetPos}%` }} />
              <span className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-[#E5484D]/80" style={{ left: `${deadlinePos}%` }} />
              {showToday && <span className="absolute inset-y-0 w-[2px] -translate-x-1/2 bg-rose-500" style={{ left: `${todayPos}%` }} />}
            </div>

            <ol>
              {stageStats.map((s) => {
                const left = s.startDate ? positionPct(s.startDate, minStart, end) : 0;
                const right = s.endDate ? positionPct(s.endDate, minStart, end) : 0;
                const width = Math.max(right - left, 0.8);
                const closed = s.status === 'Закрыт';
                return (
                  <li key={s.stage.id} className="relative flex items-center border-b border-line/60 py-3 last:border-0">
                    <div className="flex w-[170px] shrink-0 items-center gap-2.5 pr-3 sm:w-[260px] sm:gap-3 sm:pr-4">
                      <span
                        className={cn(
                          'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold',
                          closed ? 'bg-mint-100 text-mint-600' : s.status === 'В работе' ? 'bg-rose-100 text-rose-600' : 'bg-[#F2F3F7] text-ink-muted',
                        )}
                      >
                        {s.stage.id}
                      </span>
                      <div className="min-w-0">
                        <Link to={`/tasks?stage=${s.stage.id}`} className="block truncate text-[13.5px] font-semibold text-ink hover:text-rose-600">
                          {s.stage.title}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-2 text-[11.5px] text-ink-muted">
                          {s.startDate && s.endDate ? `${formatDM(s.startDate)} → ${formatDMY(s.endDate)}` : 'нет задач'}
                          <StageStatusBadge status={s.status} className="h-5 px-1.5 text-[10.5px]" />
                        </p>
                      </div>
                    </div>
                    <div className="relative h-[46px] flex-1">
                      <Tooltip
                        content={
                          <span>
                            <b>Этап {s.stage.id}. {s.stage.title}</b>
                            <br />
                            {s.startDate && s.endDate && `${formatDMY(s.startDate)} → ${formatDMY(s.endDate)}`}
                            <br />
                            Готово {s.done} из {s.applicable} ({s.pct}%) · {s.status}
                            {s.nextTask && (
                              <>
                                <br />
                                Далее: {s.nextTask.id} {s.nextTask.title} · до {formatDM(s.nextTask.dueDate)}
                              </>
                            )}
                          </span>
                        }
                      >
                        <div
                          className="absolute top-1 h-[18px] overflow-hidden rounded-full"
                          style={{ left: `${left}%`, width: `${width}%`, background: `${s.stage.color}1F` }}
                          tabIndex={0}
                          aria-label={`Этап ${s.stage.id}: ${s.pct}%`}
                        >
                          <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: closed ? '#20C997' : s.stage.color, opacity: 0.85 }} />
                          <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10.5px] font-bold text-ink-soft">{s.pct}%</span>
                        </div>
                      </Tooltip>
                      {s.nextTask ? (
                        <button
                          type="button"
                          onClick={() => s.nextTask && openDetails(s.nextTask)}
                          className="absolute top-[24px] max-w-[60%] truncate rounded bg-white/85 px-1 text-left text-[11.5px] text-ink-muted hover:text-rose-600"
                          style={{ left: `${Math.min(left, 62)}%` }}
                        >
                          Далее: <b className="font-semibold text-ink-soft">{s.nextTask.id}</b> {s.nextTask.title} · до {formatDM(s.nextTask.dueDate)}
                        </button>
                      ) : (
                        <span className="absolute top-[24px] text-[11.5px] text-mint-600" style={{ left: `${Math.min(left, 70)}%` }}>
                          {s.awaitingConfirmation ? 'Все задачи готовы — подтвердите условие закрытия' : closed ? 'Этап закрыт ✓' : ''}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
