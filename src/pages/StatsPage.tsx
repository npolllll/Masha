import { AlertTriangle, ArrowRight, CalendarDays, Flag, History } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';
import { useApp } from '@/context/AppContext';
import { addDays, formatDM, formatLong, formatShort, plural, pluralDays, todayInTimeZone } from '@/domain/dates';
import { daysUntilDue, openHardDeadlines } from '@/domain/deadlines';
import { countdown } from '@/domain/timeline';
import { DeadlineChip } from '@/components/ui/Badges';
import { SelectField } from '@/components/ui/Fields';
import { EmptyState, PageHeader } from '@/components/ui/Misc';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { cn } from '@/components/ui/cn';

type Period = 'all' | '30' | '7';
const STATUS_COLORS = { done: '#20C997', progress: '#F2A33A', todo: '#DADDE5', skipped: '#B9B3EE' };
const MONTH_COLORS = { done: '#20C997', hard: '#FF2D70', other: '#7C6FE6' };
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color?: string; payload?: { fill?: string } }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-[12.5px] shadow-soft">
      {label && <p className="mb-1 font-semibold text-ink">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-ink-soft">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color ?? p.payload?.fill }} />
          {p.name}: <b className="text-ink">{p.value}</b>
        </p>
      ))}
    </div>
  );
}

export function StatsPage() {
  const { tasks, stageStats, overall, settings, today, events } = useApp();
  const [period, setPeriod] = useState<Period>('all');
  const cd = countdown(today, settings.deadline);
  const stagesRatio = overall.stagesTotal ? overall.stagesClosed / overall.stagesTotal : 0;
  const awaiting = stageStats.filter((s) => s.awaitingConfirmation).length;
  const hard = useMemo(() => openHardDeadlines(tasks), [tasks]);

  const statusData = [
    { name: 'Выполнено', value: overall.done, color: STATUS_COLORS.done },
    { name: 'В работе', value: overall.inProgress, color: STATUS_COLORS.progress },
    { name: 'Не начато', value: overall.notStarted, color: STATUS_COLORS.todo },
    ...(overall.skipped ? [{ name: 'Не требуется', value: overall.skipped, color: STATUS_COLORS.skipped }] : []),
  ];

  // История выполнений — только из журнала событий (без выдуманных исторических данных)
  const history = useMemo(() => {
    const from = period === 'all' ? null : addDays(today, -(Number(period) - 1));
    const map = new Map<string, { done: number; undone: number }>();
    for (const e of events) {
      if (e.type !== 'statusChanged' && e.type !== 'created') continue;
      const change = e.changes.find((c) => c.field === 'status');
      if (!change) continue;
      const day = todayInTimeZone(new Date(e.at), settings.timezone);
      if (from && day < from) continue;
      const row = map.get(day) ?? { done: 0, undone: 0 };
      if (change.to === 'Готово') row.done += 1;
      else if (change.from === 'Готово') row.undone += 1;
      else continue;
      map.set(day, row);
    }
    return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, v]) => ({ day, label: formatShort(day), ...v }));
  }, [events, period, today, settings.timezone]);
  const historyDone = history.reduce((s, r) => s + r.done, 0);

  const monthly = useMemo(() => {
    const map = new Map<string, { done: number; hard: number; other: number }>();
    for (const t of tasks) {
      if (t.status === 'Не требуется') continue;
      const key = t.dueDate.slice(0, 7);
      const row = map.get(key) ?? { done: 0, hard: 0, other: 0 };
      if (t.status === 'Готово') row.done += 1;
      else if (t.deadlineType === 'Жёсткий') row.hard += 1;
      else row.other += 1;
      map.set(key, row);
    }
    return [...map.entries()]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, v]) => {
        const [y, m] = key.split('-').map(Number);
        return { key, label: `${MONTHS[m - 1]}${m === 1 ? ` ’${String(y).slice(2)}` : ''}`, ...v };
      });
  }, [tasks]);

  return (
    <div>
      <PageHeader
        title="Статистика"
        subtitle="Все показатели считаются из текущего состояния задач — без демонстрационных данных."
        actions={
          <SelectField aria-label="Период истории" value={period} onChange={(e) => setPeriod(e.target.value as Period)} wrapperClassName="w-[190px]">
            <option value="all">Весь период</option>
            <option value="30">Последние 30 дней</option>
            <option value="7">Последние 7 дней</option>
          </SelectField>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Выполнено задач" value={`${overall.done} / ${overall.applicable}`} note={overall.skipped ? `${overall.skipped} не требуется` : `${overall.inProgress} в работе`}>
          <ProgressRing value={overall.ratio} size={70} stroke={7} label={`${overall.pct}%`}>
            <span className="text-[13px] font-bold text-ink">{overall.pct}%</span>
          </ProgressRing>
        </KpiCard>
        <KpiCard
          title="Завершено этапов"
          value={`${overall.stagesClosed} / ${overall.stagesTotal}`}
          note={awaiting ? `${awaiting} ${plural(awaiting, ['ждёт', 'ждут', 'ждут'])} подтверждения` : 'закрытие — с подтверждением условия'}
        >
          <ProgressRing value={stagesRatio} size={70} stroke={7} tone="amber" label={`${Math.round(stagesRatio * 100)}%`}>
            <span className="text-[13px] font-bold text-ink">{Math.round(stagesRatio * 100)}%</span>
          </ProgressRing>
        </KpiCard>
        <KpiCard title={cd.kind === 'past' ? 'Общий ориентир прошёл' : 'До общего дедлайна'} value={cd.value} note={formatLong(settings.deadline)}>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-500">
            <CalendarDays className="h-6 w-6" />
          </span>
        </KpiCard>
        <KpiCard
          title="Просрочено"
          value={String(overall.overdue)}
          valueClass={overall.overdue ? 'text-[#D93A3F]' : undefined}
          note={`${overall.dueWithin14} ${plural(overall.dueWithin14, ['дедлайн', 'дедлайна', 'дедлайнов'])} в ближайшие 14 дней`}
        >
          <span className={cn('grid h-12 w-12 place-items-center rounded-2xl', overall.overdue ? 'bg-[#FDECEC] text-[#D93A3F]' : 'bg-mint-50 text-mint-600')}>
            <AlertTriangle className="h-6 w-6" />
          </span>
        </KpiCard>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="card p-5 sm:p-6" aria-labelledby="stages-progress">
          <h2 id="stages-progress" className="mb-5 text-[16px] font-bold text-ink">
            Прогресс по этапам
          </h2>
          <ul className="space-y-3.5">
            {stageStats.map((s) => (
              <li key={s.stage.id}>
                <Link to={`/tasks?stage=${s.stage.id}`} className="group grid grid-cols-[110px_minmax(0,1fr)_88px] items-center gap-3 sm:grid-cols-[150px_minmax(0,1fr)_110px]">
                  <span className="truncate text-[13.5px] text-ink-soft group-hover:text-rose-600" title={s.stage.title}>
                    {s.stage.shortTitle}
                  </span>
                  <ProgressBar value={s.ratio} tone={s.pct > 0 ? 'green' : 'grey'} height={10} label={`${s.stage.title}: ${s.pct}%`} />
                  <span className="text-right text-[13px] tabular-nums text-ink-muted">
                    <b className="text-ink">{s.pct}%</b> · {s.done}/{s.applicable}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-[12px] text-ink-faint">Прогресс этапа = «Готово» / применимые задачи этапа (без «Не требуется»).</p>
        </section>

        <section className="card p-5 sm:p-6" aria-labelledby="status-chart">
          <h2 id="status-chart" className="text-[16px] font-bold text-ink">
            Статусы задач
          </h2>
          <div className="relative mx-auto mt-2 h-[210px] w-[210px]">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={62} outerRadius={96} startAngle={90} endAngle={-270} paddingAngle={1.5} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                  {statusData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <RTooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-[28px] font-bold leading-none text-ink">{overall.total}</p>
                <p className="mt-1 text-[12px] text-ink-muted">всего</p>
              </div>
            </div>
          </div>
          <ul className="mt-4 space-y-2.5">
            {statusData.map((d) => (
              <li key={d.name} className="flex items-center gap-3 text-[13.5px]">
                <span className="h-3 w-3 rounded-full" style={{ background: d.color }} />
                <span className="flex-1 text-ink-soft">{d.name}</span>
                <span className="font-semibold tabular-nums text-ink">{d.value}</span>
                <span className="w-10 text-right text-[12px] tabular-nums text-ink-muted">{overall.total ? Math.round((d.value / overall.total) * 100) : 0}%</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <section className="card p-5 sm:p-6" aria-labelledby="hard-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="hard-title" className="flex items-center gap-2 text-[16px] font-bold text-ink">
              <Flag className="h-4 w-4 text-rose-500" /> Ближайшие жёсткие дедлайны
            </h2>
            <span className="text-[12.5px] text-ink-muted">{hard.length} открыто</span>
          </div>
          {hard.length === 0 ? (
            <EmptyState title="Жёстких дедлайнов не осталось" className="py-6" />
          ) : (
            <ul className="divide-y divide-line">
              {hard.slice(0, 6).map((t) => {
                const d = daysUntilDue(t, today) ?? 0;
                return (
                  <li key={t.uid} className="flex items-center gap-3 py-3">
                    <span className={cn('w-[54px] shrink-0 text-[13px] font-bold tabular-nums', d < 0 ? 'text-[#D93A3F]' : 'text-rose-600')}>{formatDM(t.dueDate)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-[13.5px] font-medium text-ink">
                        {t.id} {t.title}
                      </span>
                      <span className="text-[12px] text-ink-muted">
                        Этап {t.stageId} · {t.assignee}
                      </span>
                    </span>
                    <DeadlineChip task={t} today={today} className="hidden min-w-0 sm:inline-flex" />
                  </li>
                );
              })}
            </ul>
          )}
          <Link to="/tasks" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-rose-600 hover:text-rose-700">
            Все задачи <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section className="card p-5 sm:p-6" aria-labelledby="history-title">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="history-title" className="flex items-center gap-2 text-[16px] font-bold text-ink">
              <History className="h-4 w-4 text-rose-500" /> История выполнений
            </h2>
            <span className="text-[12.5px] text-ink-muted">
              {historyDone ? `${historyDone} ${plural(historyDone, ['отметка', 'отметки', 'отметок'])} «Готово»` : 'по журналу событий'}
            </span>
          </div>
          {history.length === 0 ? (
            <EmptyState icon={<History className="h-6 w-6" />} title="Истории пока нет">
              Здесь появится динамика, когда вы будете отмечать задачи выполненными в приложении. 9 задач, готовых в исходном Excel,
              не имеют дат выполнения — поэтому мы не рисуем для них выдуманный тренд.
            </EmptyState>
          ) : (
            <>
              <div className="h-[230px]">
                <ResponsiveContainer>
                  <BarChart data={history} margin={{ top: 10, right: 8, left: -18, bottom: 0 }} barCategoryGap="30%">
                    <CartesianGrid vertical={false} stroke="#EEF0F4" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11.5, fill: '#8790A3' }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11.5, fill: '#8790A3' }} />
                    <RTooltip content={<ChartTooltip />} cursor={{ fill: '#F4F5F8' }} />
                    <Bar dataKey="done" name="Отмечено «Готово»" fill={MONTH_COLORS.done} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="undone" name="Снята отметка" fill="#DADDE5" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 flex gap-4 text-[12px] text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-mint-500" /> Отмечено «Готово»
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#DADDE5]" /> Снята отметка
                </span>
              </div>
            </>
          )}
        </section>
      </div>

      <section className="card mt-5 p-5 sm:p-6" aria-labelledby="monthly-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="monthly-title" className="text-[16px] font-bold text-ink">
              Дедлайны по месяцам
            </h2>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">Нагрузка по плану: сколько задач заканчивается в каждом месяце.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-[12px] text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: MONTH_COLORS.done }} /> Выполнено
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: MONTH_COLORS.hard }} /> Открытые жёсткие
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: MONTH_COLORS.other }} /> Открытые плановые и ориентиры
            </span>
          </div>
        </div>
        <div className="h-[260px]">
          <ResponsiveContainer>
            <BarChart data={monthly} margin={{ top: 10, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
              <CartesianGrid vertical={false} stroke="#EEF0F4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11.5, fill: '#8790A3' }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11.5, fill: '#8790A3' }} />
              <RTooltip content={<ChartTooltip />} cursor={{ fill: '#F4F5F8' }} />
              <Bar dataKey="done" name="Выполнено" stackId="m" fill={MONTH_COLORS.done} stroke="#fff" strokeWidth={2} maxBarSize={34} />
              <Bar dataKey="hard" name="Открытые жёсткие" stackId="m" fill={MONTH_COLORS.hard} stroke="#fff" strokeWidth={2} maxBarSize={34} />
              <Bar dataKey="other" name="Открытые плановые и ориентиры" stackId="m" fill={MONTH_COLORS.other} stroke="#fff" strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <details className="mt-3 text-[13px] text-ink-muted">
          <summary className="cursor-pointer font-medium text-ink-soft">Таблица данных</summary>
          <table className="mt-2 w-full max-w-lg text-left">
            <thead>
              <tr className="text-[12px] text-ink-faint">
                <th className="py-1 font-medium">Месяц</th>
                <th className="py-1 font-medium">Выполнено</th>
                <th className="py-1 font-medium">Жёсткие</th>
                <th className="py-1 font-medium">Остальные</th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((m) => (
                <tr key={m.key} className="border-t border-line">
                  <td className="py-1">{m.key}</td>
                  <td className="py-1">{m.done}</td>
                  <td className="py-1">{m.hard}</td>
                  <td className="py-1">{m.other}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>
      <p className="mt-4 text-[12px] text-ink-faint">
        Данные на {formatLong(today)} · до общего дедлайна {cd.kind === 'future' ? pluralDays(cd.days) : cd.value}.
      </p>
    </div>
  );
}

function KpiCard({ title, value, note, children, valueClass }: { title: string; value: string; note?: string; children?: ReactNode; valueClass?: string }) {
  return (
    <section className="card flex items-center justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="text-[13px] text-ink-muted">{title}</p>
        <p className={cn('mt-2 text-[24px] font-bold leading-none tracking-tight text-ink', valueClass)}>{value}</p>
        {note && <p className="mt-2 line-clamp-2 text-[12px] leading-snug text-ink-faint">{note}</p>}
      </div>
      {children}
    </section>
  );
}
