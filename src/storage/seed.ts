import seed from '@/data/seed.json';
import { newUuid } from '@/domain/ids';
import type { DeadlineType, EuropeGuideline, Stage, Task, TaskStatus } from '@/domain/types';

interface SeedTask {
  id: string;
  stageId: number;
  title: string;
  startDate: string;
  dueDate: string;
  assignee: string;
  deadlineType: string;
  status: string;
  result: string;
  conditional: boolean;
}

interface SeedStage {
  id: number;
  title: string;
  shortTitle: string;
  completionCriterion: string;
  color: string;
}

export const SEED_TASKS = seed.tasks as SeedTask[];
export const SEED_STAGES = seed.stages as SeedStage[];
export const EUROPE_GUIDELINES = seed.europeGuidelines as EuropeGuideline[];
export const SEED_SOURCE = seed.source;

/** Задачи из Excel со ВСЕМИ исходными статусами (ничего не сбрасывается). */
export function buildSeedTasks(now = new Date().toISOString()): Task[] {
  return SEED_TASKS.map((t) => ({
    uid: newUuid(),
    id: t.id,
    stageId: t.stageId,
    title: t.title,
    description: '',
    result: t.result ?? '',
    startDate: t.startDate,
    dueDate: t.dueDate,
    assignee: t.assignee,
    deadlineType: t.deadlineType as DeadlineType,
    status: t.status as TaskStatus,
    prevStatus: null,
    conditional: Boolean(t.conditional),
    source: 'excel',
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    deletedAt: null,
  }));
}

export function buildSeedStages(): Stage[] {
  return SEED_STAGES.map((s) => ({
    id: s.id,
    title: s.title,
    shortTitle: s.shortTitle,
    completionCriterion: s.completionCriterion,
    color: s.color,
    criterionConfirmed: false,
    criterionConfirmedAt: null,
  }));
}
