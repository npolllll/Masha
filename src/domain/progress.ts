import { addDays, maxISO, minISO } from './dates';
import { isApplicable, isDone, isHard, isOpen, overdueTasks, sortByDue } from './deadlines';
import { compareTaskIds } from './ids';
import type { ISODate, Stage, StageStatus, Task } from './types';

export interface StageStats {
  stage: Stage;
  tasks: Task[];
  /** Все задачи этапа (Excel: «Задач»). */
  total: number;
  /** Задачи без «Не требуется» — знаменатель прогресса. */
  applicable: number;
  done: number;
  inProgress: number;
  notStarted: number;
  skipped: number;
  /** done / applicable, 0..1 */
  ratio: number;
  /** Округлённый процент 0..100 */
  pct: number;
  /** Excel: MINIFS(Старт) */
  startDate: ISODate | null;
  /** Excel: MAXIFS(Дедлайн) */
  endDate: ISODate | null;
  status: StageStatus;
  /** Все применимые задачи готовы. */
  allDone: boolean;
  /** Все задачи готовы, но условие закрытия ещё не подтверждено вручную. */
  awaitingConfirmation: boolean;
  /** Excel: «Ближайший открытый дедлайн» */
  nearestOpenDeadline: ISODate | null;
  /** Ближайшее действие: первая открытая задача по сроку. */
  nextTask: Task | null;
}

export function computeStageStats(stage: Stage, allTasks: Task[]): StageStats {
  const tasks = allTasks.filter((t) => t.stageId === stage.id).sort((a, b) => compareTaskIds(a.id, b.id));
  const applicableTasks = tasks.filter(isApplicable);
  const done = applicableTasks.filter(isDone).length;
  const inProgress = tasks.filter((t) => t.status === 'В работе').length;
  const notStarted = tasks.filter((t) => t.status === 'Не начато').length;
  const skipped = tasks.length - applicableTasks.length;
  const applicable = applicableTasks.length;
  const ratio = applicable === 0 ? 0 : done / applicable;
  const allDone = applicable > 0 && done === applicable;
  let status: StageStatus;
  if (allDone && stage.criterionConfirmed) status = 'Закрыт';
  else if (applicableTasks.some((t) => t.status === 'В работе' || t.status === 'Готово')) status = 'В работе';
  else status = 'Не начат';
  const open = tasks.filter(isOpen).sort(sortByDue);
  return {
    stage,
    tasks,
    total: tasks.length,
    applicable,
    done,
    inProgress,
    notStarted,
    skipped,
    ratio,
    pct: Math.round(ratio * 100),
    startDate: minISO(tasks.map((t) => t.startDate)),
    endDate: maxISO(tasks.map((t) => t.dueDate)),
    status,
    allDone,
    awaitingConfirmation: allDone && !stage.criterionConfirmed,
    nearestOpenDeadline: open[0]?.dueDate ?? null,
    nextTask: open[0] ?? null,
  };
}

export function computeAllStageStats(stages: Stage[], tasks: Task[]): StageStats[] {
  return [...stages].sort((a, b) => a.id - b.id).map((s) => computeStageStats(s, tasks));
}

export interface OverallStats {
  total: number;
  applicable: number;
  done: number;
  inProgress: number;
  notStarted: number;
  skipped: number;
  ratio: number;
  pct: number;
  stagesTotal: number;
  stagesClosed: number;
  hardTotal: number;
  hardOpen: number;
  overdue: number;
  /** Excel «Сводка»: дедлайн в ближайшие 14 дней (0 ≤ дней ≤ 14). */
  dueWithin14: number;
}

export function computeOverall(tasks: Task[], stageStats: StageStats[], today: ISODate): OverallStats {
  const applicable = tasks.filter(isApplicable).length;
  const done = tasks.filter(isDone).length;
  const ratio = applicable === 0 ? 0 : done / applicable;
  const horizon = addDays(today, 14);
  return {
    total: tasks.length,
    applicable,
    done,
    inProgress: tasks.filter((t) => t.status === 'В работе').length,
    notStarted: tasks.filter((t) => t.status === 'Не начато').length,
    skipped: tasks.length - applicable,
    ratio,
    pct: Math.round(ratio * 100),
    stagesTotal: stageStats.length,
    stagesClosed: stageStats.filter((s) => s.status === 'Закрыт').length,
    hardTotal: tasks.filter(isHard).length,
    hardOpen: tasks.filter((t) => isHard(t) && isOpen(t)).length,
    overdue: overdueTasks(tasks, today).length,
    dueWithin14: tasks.filter((t) => isOpen(t) && t.dueDate >= today && t.dueDate <= horizon).length,
  };
}

/** Этап, на котором сейчас фокус: тот, где ближайший открытый дедлайн. */
export function focusStageId(stageStats: StageStats[]): number | null {
  let best: StageStats | null = null;
  for (const s of stageStats) {
    if (!s.nearestOpenDeadline) continue;
    if (!best || s.nearestOpenDeadline < (best.nearestOpenDeadline as string)) best = s;
  }
  return best ? best.stage.id : null;
}

/** Полная правая граница плана: максимум дедлайнов. */
export function planEndDate(tasks: Task[], fallback: ISODate): ISODate {
  return maxISO(tasks.map((t) => t.dueDate)) ?? fallback;
}
