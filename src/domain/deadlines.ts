import { addDays, daysBetween, formatDM, plural, DAY_FORMS } from './dates';
import { compareTaskIds } from './ids';
import type { ISODate, Task } from './types';

/** Задача ещё требует действий: не «Готово» и не «Не требуется». */
export const isOpen = (t: Task) => t.status !== 'Готово' && t.status !== 'Не требуется';
/** Задача входит в знаменатель прогресса. */
export const isApplicable = (t: Task) => t.status !== 'Не требуется';
export const isDone = (t: Task) => t.status === 'Готово';
export const isHard = (t: Task) => t.deadlineType === 'Жёсткий';

/** Аналог колонки Excel «Дней до дедлайна»: E − TODAY(); null для завершённых. */
export function daysUntilDue(task: Task, today: ISODate): number | null {
  if (!isOpen(task)) return null;
  return daysBetween(today, task.dueDate);
}

export type DeadlineBucket =
  | 'done'
  | 'skipped'
  | 'overdue'
  | 'today'
  | 'tomorrow'
  | 'soon' // 2–3 дня
  | 'week' // 4–7 дней
  | 'later';

export interface DeadlineInfo {
  bucket: DeadlineBucket;
  /** dueDate − today в календарных днях (для всех задач). */
  days: number;
  /** start ≤ today ≤ due и задача открыта. */
  active: boolean;
  /** start > today. */
  future: boolean;
}

export function classifyTask(task: Task, today: ISODate): DeadlineInfo {
  const days = daysBetween(today, task.dueDate);
  const startDiff = daysBetween(today, task.startDate);
  const open = isOpen(task);
  let bucket: DeadlineBucket;
  if (task.status === 'Готово') bucket = 'done';
  else if (task.status === 'Не требуется') bucket = 'skipped';
  else if (days < 0) bucket = 'overdue';
  else if (days === 0) bucket = 'today';
  else if (days === 1) bucket = 'tomorrow';
  else if (days <= 3) bucket = 'soon';
  else if (days <= 7) bucket = 'week';
  else bucket = 'later';
  return {
    bucket,
    days,
    active: open && startDiff <= 0 && days >= 0,
    future: startDiff > 0,
  };
}

/** Подпись относительного срока для чипа. */
export function relativeDeadlineLabel(task: Task, today: ISODate): string {
  if (task.status === 'Готово') return 'Выполнено';
  if (task.status === 'Не требуется') return 'Исключена';
  const days = daysBetween(today, task.dueDate);
  if (days === 0) return 'Сегодня';
  if (days === 1) return 'Завтра';
  if (days === -1) return 'Вчера';
  if (days < 0) return `Просрочено на ${-days} ${plural(-days, DAY_FORMS)}`;
  return `Через ${days} ${plural(days, DAY_FORMS)}`;
}

export type ChipTone = 'done' | 'skipped' | 'overdue' | 'urgent' | 'soon' | 'neutral';

export function deadlineTone(task: Task, today: ISODate): ChipTone {
  const { bucket } = classifyTask(task, today);
  switch (bucket) {
    case 'done':
      return 'done';
    case 'skipped':
      return 'skipped';
    case 'overdue':
      return 'overdue';
    case 'today':
    case 'tomorrow':
      return 'urgent';
    case 'soon':
    case 'week':
      return 'soon';
    default:
      return 'neutral';
  }
}

export function sortByDue(a: Task, b: Task): number {
  if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
  return compareTaskIds(a.id, b.id);
}

/**
 * Производный список жёстких дедлайнов — аналог вкладки Excel «Жёсткие дедлайны»:
 * SORT(FILTER(Задачи, Тип="Жёсткий", Статус<>"Готово", Статус<>"Отменено"), Дедлайн).
 */
export function openHardDeadlines(tasks: Task[]): Task[] {
  return tasks.filter((t) => isHard(t) && isOpen(t)).sort(sortByDue);
}

/** Открытые задачи с дедлайном в [today, today + n] (Excel: «Дедлайн в ближайшие 14 дней»). */
export function dueWithin(tasks: Task[], today: ISODate, n: number): Task[] {
  const end = addDays(today, n);
  return tasks.filter((t) => isOpen(t) && t.dueDate >= today && t.dueDate <= end).sort(sortByDue);
}

export function overdueTasks(tasks: Task[], today: ISODate): Task[] {
  return tasks.filter((t) => isOpen(t) && t.dueDate < today).sort(sortByDue);
}

/**
 * «Ближайшие задачи» для главной: сначала просроченные, затем всё с дедлайном в ближайшие
 * 14 дней; если таких меньше `min`, добавляем следующие по сроку. Не более `max`.
 */
export function upcomingTasks(tasks: Task[], today: ISODate, min = 3, max = 5): Task[] {
  const open = tasks.filter(isOpen).sort((a, b) => {
    const ao = a.dueDate < today ? 0 : 1;
    const bo = b.dueDate < today ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return sortByDue(a, b);
  });
  const horizon = addDays(today, 14);
  const primary = open.filter((t) => t.dueDate <= horizon);
  if (primary.length >= min) return primary.slice(0, max);
  return open.slice(0, Math.min(max, Math.max(min, primary.length)));
}

export function dueRangeLabel(task: Task): string {
  return task.startDate === task.dueDate ? formatDM(task.dueDate) : `${formatDM(task.startDate)} – ${formatDM(task.dueDate)}`;
}
