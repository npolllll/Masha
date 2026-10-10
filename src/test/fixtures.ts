import { buildSeedStages, buildSeedTasks } from '@/storage/seed';
import type { Task } from '@/domain/types';

export const seedTasks = () => buildSeedTasks('2026-10-10T09:00:00.000Z');
export const seedStages = () => buildSeedStages();

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    uid: overrides.uid ?? `uid-${Math.random().toString(36).slice(2)}`,
    id: '9.9',
    stageId: 0,
    title: 'Тестовая задача',
    description: '',
    result: '',
    startDate: '2026-10-10',
    dueDate: '2026-10-10',
    assignee: 'Маша',
    deadlineType: 'Плановый',
    status: 'Не начато',
    prevStatus: null,
    conditional: false,
    source: 'user',
    createdAt: '2026-10-10T09:00:00.000Z',
    updatedAt: '2026-10-10T09:00:00.000Z',
    completedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

export const byId = (tasks: Task[], id: string) => {
  const t = tasks.find((x) => x.id === id);
  if (!t) throw new Error(`no task ${id}`);
  return t;
};
