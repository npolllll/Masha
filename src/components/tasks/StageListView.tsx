import { CheckCircle2, ChevronDown, Plus } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatDMY, formatLong } from '@/domain/dates';
import type { StageStats } from '@/domain/progress';
import type { Task } from '@/domain/types';
import { StageStatusBadge } from '@/components/ui/Badges';
import { ProgressBar } from '@/components/ui/Progress';
import { cn } from '@/components/ui/cn';
import { TaskRow } from './TaskRow';

export interface StageGroup {
  stats: StageStats;
  tasks: Task[];
}

export function StageListView({
  groups,
  collapsed,
  onToggleCollapse,
  flashUid,
  filtersActive,
}: {
  groups: StageGroup[];
  collapsed: Set<number>;
  onToggleCollapse: (id: number) => void;
  flashUid: string | null;
  filtersActive: boolean;
}) {
  const { today } = useApp();
  return (
    <div className="relative pl-7 sm:pl-10">
      <span aria-hidden className="absolute bottom-6 left-[9px] top-2 w-[2px] rounded-full bg-gradient-to-b from-rose-400 via-rose-300 to-rose-200 sm:left-[13px]" />
      <div className="relative mb-4 flex items-center gap-3">
        <span aria-hidden className="absolute -left-[26px] grid h-5 w-5 place-items-center rounded-full border-2 border-rose-500 bg-white sm:-left-[36px]">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        </span>
        <div>
          <p className="text-[13.5px] font-semibold text-rose-600">Сегодня</p>
          <p className="text-[12.5px] text-ink-muted">{formatLong(today)}</p>
        </div>
      </div>
      <ol className="space-y-5">
        {groups.map((g) => (
          <StageBlock
            key={g.stats.stage.id}
            group={g}
            collapsed={collapsed.has(g.stats.stage.id)}
            onToggle={() => onToggleCollapse(g.stats.stage.id)}
            flashUid={flashUid}
            filtersActive={filtersActive}
          />
        ))}
      </ol>
    </div>
  );
}

function StageBlock({
  group,
  collapsed,
  onToggle,
  flashUid,
  filtersActive,
}: {
  group: StageGroup;
  collapsed: boolean;
  onToggle: () => void;
  flashUid: string | null;
  filtersActive: boolean;
}) {
  const { confirmStage, openCreate } = useApp();
  const { stats, tasks } = group;
  const { stage } = stats;
  const bodyId = `stage-body-${stage.id}`;
  return (
    <li className="relative">
      <span
        aria-hidden
        className={cn(
          'absolute -left-[24px] top-[30px] h-3 w-3 rounded-full ring-4 ring-page sm:-left-[32px]',
          stats.status === 'Закрыт' ? 'bg-mint-500' : 'bg-rose-500',
        )}
      />
      <section aria-labelledby={`stage-title-${stage.id}`} className="overflow-hidden rounded-[20px] border border-line/80 bg-white shadow-card">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 bg-[#F7F8FB] px-4 py-4 sm:px-5">
          <span
            className={cn(
              'grid h-11 w-11 shrink-0 place-items-center rounded-full text-[20px] font-bold',
              stats.status === 'Закрыт' ? 'bg-mint-100 text-mint-600' : 'bg-rose-100 text-rose-500',
            )}
          >
            {stage.id}
          </span>
          <div className="min-w-0 flex-1">
            <h3 id={`stage-title-${stage.id}`} className="text-[15.5px] font-bold text-ink">
              Этап {stage.id}. {stage.title}
            </h3>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
              {stats.startDate && stats.endDate ? `${formatDMY(stats.startDate)} → ${formatDMY(stats.endDate)}` : 'нет задач'}
              <StageStatusBadge status={stats.status} className="h-5 px-1.5 text-[11px]" />
              {stats.skipped > 0 && <span className="text-ink-faint">· {stats.skipped} не требуется</span>}
            </p>
          </div>
          <div className="flex w-full items-center gap-3 sm:w-auto">
            <ProgressBar
              value={stats.ratio}
              tone={stats.pct === 100 ? 'green' : 'pink'}
              className="w-full sm:w-44 lg:w-56"
              height={7}
              label={`Прогресс этапа ${stage.id}`}
            />
            <span className="whitespace-nowrap text-[13px] font-medium tabular-nums text-ink-soft">
              {stats.done} / {stats.applicable}
            </span>
            <span className="w-10 text-right text-[14px] font-bold tabular-nums text-ink">{stats.pct}%</span>
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={!collapsed}
              aria-controls={bodyId}
              aria-label={collapsed ? `Развернуть этап ${stage.id}` : `Свернуть этап ${stage.id}`}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-muted hover:bg-white"
            >
              <ChevronDown className={cn('h-5 w-5 transition', collapsed && '-rotate-90')} />
            </button>
          </div>
        </div>
        {!collapsed && (
          <div id={bodyId}>
            {tasks.length ? (
              <ul className="divide-y divide-line/80">
                {tasks.map((t) => (
                  <TaskRow key={t.uid} task={t} flash={t.uid === flashUid} />
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-center text-[13.5px] text-ink-muted">
                {filtersActive ? 'В этом этапе нет задач под выбранные фильтры.' : 'В этом этапе пока нет задач.'}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/80 bg-[#FCFCFD] px-4 py-3 sm:px-5">
              <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={stage.criterionConfirmed}
                  onChange={(e) => void confirmStage(stage.id, e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-mint-500"
                />
                <span>
                  <span className="font-semibold text-ink">Этап закрыт, когда:</span> {stage.completionCriterion}
                  {stats.awaitingConfirmation && (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-mint-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> все задачи готовы — подтвердите условие
                    </span>
                  )}
                  {stage.criterionConfirmed && !stats.allDone && (
                    <span className="ml-1.5 text-amber-600">(подтверждено, но не все задачи готовы)</span>
                  )}
                </span>
              </label>
              <button
                type="button"
                onClick={() => openCreate({ stageId: stage.id })}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] font-semibold text-rose-600 hover:bg-rose-50"
              >
                <Plus className="h-4 w-4" /> Задача в этап {stage.id}
              </button>
            </div>
          </div>
        )}
      </section>
    </li>
  );
}
