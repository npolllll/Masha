import { sortByDue } from './deadlines';
import { compareTaskIds } from './ids';
import type { DeadlineType, Task, TaskStatus } from './types';

export type SortMode = 'id' | 'due' | 'dueDesc' | 'start';

export interface TaskFilter {
  stageId: number | 'all';
  query: string;
  status: TaskStatus | 'all' | 'open';
  assignee: string | 'all';
  deadlineType: DeadlineType | 'all';
}

export const EMPTY_FILTER: TaskFilter = {
  stageId: 'all',
  query: '',
  status: 'all',
  assignee: 'all',
  deadlineType: 'all',
};

/** Владельцы как отдельные люди: «Маша, Никита» → [«Маша», «Никита»]. */
export function splitAssignees(assignee: string): string[] {
  return assignee
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function allAssignees(tasks: Task[]): string[] {
  const set = new Set<string>();
  tasks.forEach((t) => splitAssignees(t.assignee).forEach((a) => set.add(a)));
  const order = ['Маша', 'Никита'];
  return [...set].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    if (a === '—') return 1;
    if (b === '—') return -1;
    return a.localeCompare(b, 'ru');
  });
}

const norm = (s: string) => s.toLocaleLowerCase('ru').replace(/ё/g, 'е');

export function filterTasks(tasks: Task[], f: TaskFilter): Task[] {
  const q = norm(f.query.trim());
  return tasks.filter((t) => {
    if (f.stageId !== 'all' && t.stageId !== f.stageId) return false;
    if (f.status === 'open' && (t.status === 'Готово' || t.status === 'Не требуется')) return false;
    if (f.status !== 'all' && f.status !== 'open' && t.status !== f.status) return false;
    if (f.assignee !== 'all' && !splitAssignees(t.assignee).includes(f.assignee)) return false;
    if (f.deadlineType !== 'all' && t.deadlineType !== f.deadlineType) return false;
    if (q) {
      const hay = norm(`${t.id} ${t.title} ${t.description} ${t.result} ${t.assignee}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function sortTasks(tasks: Task[], mode: SortMode): Task[] {
  const arr = [...tasks];
  switch (mode) {
    case 'due':
      return arr.sort(sortByDue);
    case 'dueDesc':
      return arr.sort((a, b) => -sortByDue(a, b));
    case 'start':
      return arr.sort((a, b) => (a.startDate === b.startDate ? sortByDue(a, b) : a.startDate < b.startDate ? -1 : 1));
    default:
      return arr.sort((a, b) => compareTaskIds(a.id, b.id));
  }
}

export function isFilterActive(f: TaskFilter): boolean {
  return f.query.trim() !== '' || f.status !== 'all' || f.assignee !== 'all' || f.deadlineType !== 'all';
}
