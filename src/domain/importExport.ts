import { z } from 'zod';
import { isValidISODate } from './dates';
import { DEFAULT_SETTINGS, DEADLINE_TYPES, EVENT_TYPES, TASK_STATUSES } from './types';
import type { LinkItem, Settings, Stage, Task, TaskEvent } from './types';
import { newUuid } from './ids';

export const APP_ID = 'masha-ba-2027';
export const SCHEMA_VERSION = 1;

const isoDate = z.string().refine(isValidISODate, { message: 'Ожидается дата YYYY-MM-DD' });

/** Excel допускал «Отменено» и «Блок»: переводим в модель приложения. */
const statusSchema = z.preprocess((v) => {
  if (v === 'Отменено') return 'Не требуется';
  if (v === 'Блок') return 'В работе';
  return v;
}, z.enum(TASK_STATUSES));

export const taskSchema = z
  .object({
    uid: z.string().min(1).optional(),
    id: z.string().min(1),
    stageId: z.number().int().min(0).max(8),
    title: z.string().trim().min(1),
    description: z.string().optional().default(''),
    result: z.string().optional().default(''),
    startDate: isoDate,
    dueDate: isoDate,
    assignee: z.string().optional().default('Маша'),
    deadlineType: z.enum(DEADLINE_TYPES),
    status: statusSchema,
    prevStatus: statusSchema.nullable().optional().default(null),
    conditional: z.boolean().optional().default(false),
    source: z.enum(['excel', 'user']).optional().default('excel'),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    completedAt: z.string().nullable().optional().default(null),
    deletedAt: z.string().nullable().optional().default(null),
  })
  .refine((t) => t.startDate <= t.dueDate, { message: 'Дата начала позже дедлайна', path: ['startDate'] });

export const stageSchema = z.object({
  id: z.number().int().min(0).max(8),
  title: z.string().min(1),
  shortTitle: z.string().optional(),
  completionCriterion: z.string().default(''),
  color: z.string().optional(),
  criterionConfirmed: z.boolean().optional().default(false),
  criterionConfirmedAt: z.string().nullable().optional().default(null),
});

const changeSchema = z.object({ field: z.string(), from: z.unknown(), to: z.unknown() });

export const eventSchema = z.object({
  seq: z.number().optional(),
  id: z.string().optional(),
  at: z.string(),
  type: z.enum(EVENT_TYPES),
  taskUid: z.string(),
  taskId: z.string(),
  taskTitle: z.string().default(''),
  changes: z.array(changeSchema).default([]),
  snapshot: z.any().optional(),
});

export const settingsSchema = z.object({
  id: z.literal('app').optional().default('app'),
  deadline: isoDate.optional(),
  submitTarget: isoDate.optional(),
  planStart: isoDate.optional(),
  timezone: z.string().optional(),
  theme: z.literal('light').optional(),
  userName: z.string().optional(),
  avatarInitials: z.string().optional(),
  celebrate: z.boolean().optional(),
});

export const linkSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  url: z.string().min(1),
  note: z.string().optional().default(''),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const exportFileSchema = z.object({
  app: z.literal(APP_ID),
  schemaVersion: z.number().int().min(1),
  exportedAt: z.string(),
  data: z.object({
    tasks: z.array(taskSchema),
    stages: z.array(stageSchema).length(9, 'Должно быть ровно 9 этапов'),
    events: z.array(eventSchema).default([]),
    settings: settingsSchema.default({}),
    links: z.array(linkSchema).default([]),
  }),
});

export interface AppSnapshot {
  tasks: Task[];
  stages: Stage[];
  events: TaskEvent[];
  settings: Settings;
  links: LinkItem[];
}

export interface ExportFile {
  app: typeof APP_ID;
  schemaVersion: number;
  exportedAt: string;
  data: AppSnapshot;
}

export function buildExport(snapshot: AppSnapshot, now = new Date()): ExportFile {
  return { app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), data: snapshot };
}

/** Миграции экспортных файлов старых версий схемы → текущая. */
export function migrateExport(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const obj = raw as Record<string, unknown>;
  // seed-формат без обёртки
  if (!('app' in obj) && 'tasks' in obj && 'stages' in obj) {
    return {
      app: APP_ID,
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data: { tasks: obj.tasks, stages: obj.stages, events: [], settings: {}, links: [] },
    };
  }
  // v1 — текущая. Будущие версии добавляют шаги здесь: if (v === 1) {...; v = 2}
  return obj;
}

export type ParseResult = { ok: true; snapshot: AppSnapshot; schemaVersion: number } | { ok: false; errors: string[] };

const STAGE_DEFAULT_COLORS = ['#2F6FD0', '#7A55C7', '#14919B', '#C98A04', '#D9483B', '#2A8F55', '#C2417A', '#8A6534', '#4A5868'];

export function parseImport(text: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`Файл не является корректным JSON: ${(e as Error).message}`] };
  }
  const migrated = migrateExport(json);
  const parsed = exportFileSchema.safeParse(migrated);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.slice(0, 8).map((i) => `${i.path.join('.') || 'файл'}: ${i.message}`),
    };
  }
  if (parsed.data.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, errors: [`Версия схемы ${parsed.data.schemaVersion} новее поддерживаемой (${SCHEMA_VERSION})`] };
  }
  const now = new Date().toISOString();
  const d = parsed.data.data;
  const ids = new Set<string>();
  const errors: string[] = [];
  const tasks: Task[] = d.tasks.map((t) => {
    const uid = t.uid ?? newUuid();
    if (ids.has(uid)) errors.push(`Повторяющийся uid задачи ${t.id}`);
    ids.add(uid);
    return {
      uid,
      id: t.id,
      stageId: t.stageId,
      title: t.title,
      description: t.description ?? '',
      result: t.result ?? '',
      startDate: t.startDate,
      dueDate: t.dueDate,
      assignee: t.assignee ?? 'Маша',
      deadlineType: t.deadlineType,
      status: t.status,
      prevStatus: t.prevStatus ?? null,
      conditional: t.conditional ?? false,
      source: t.source ?? 'excel',
      createdAt: t.createdAt ?? now,
      updatedAt: t.updatedAt ?? now,
      completedAt: t.completedAt ?? null,
      deletedAt: t.deletedAt ?? null,
    };
  });
  const liveIds = tasks.filter((t) => !t.deletedAt).map((t) => t.id);
  const dup = liveIds.filter((id, i) => liveIds.indexOf(id) !== i);
  if (dup.length) errors.push(`Повторяющиеся ID задач: ${[...new Set(dup)].join(', ')}`);
  const stageIds = d.stages.map((s) => s.id).sort();
  if (stageIds.join(',') !== '0,1,2,3,4,5,6,7,8') errors.push('Этапы должны иметь ID 0..8');
  if (errors.length) return { ok: false, errors };

  const stages: Stage[] = d.stages
    .map((s) => ({
      id: s.id,
      title: s.title,
      shortTitle: s.shortTitle ?? s.title.split(/[:\s]/)[0],
      completionCriterion: s.completionCriterion,
      color: s.color ?? STAGE_DEFAULT_COLORS[s.id],
      criterionConfirmed: s.criterionConfirmed ?? false,
      criterionConfirmedAt: s.criterionConfirmedAt ?? null,
    }))
    .sort((a, b) => a.id - b.id);
  const settings: Settings = { ...DEFAULT_SETTINGS, ...stripUndefined(d.settings), id: 'app', theme: 'light' };
  const events: TaskEvent[] = d.events.map((e) => ({
    id: e.id ?? newUuid(),
    at: e.at,
    type: e.type,
    taskUid: e.taskUid,
    taskId: e.taskId,
    taskTitle: e.taskTitle,
    changes: e.changes.map((c) => ({ field: c.field, from: c.from, to: c.to })),
    snapshot: e.snapshot as Task | undefined,
  }));
  const links: LinkItem[] = d.links.map((l) => ({
    id: l.id ?? newUuid(),
    title: l.title,
    url: l.url,
    note: l.note ?? '',
    createdAt: l.createdAt ?? now,
    updatedAt: l.updatedAt ?? now,
  }));
  return { ok: true, schemaVersion: parsed.data.schemaVersion, snapshot: { tasks, stages, events, settings, links } };
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export interface ImportPreview {
  added: Task[];
  removed: Task[];
  changed: { before: Task; after: Task; fields: (keyof Task)[] }[];
  statusChanges: number;
  eventsCount: number;
  linksCount: number;
  settingsChanged: string[];
}

const COMPARE_FIELDS: (keyof Task)[] = [
  'title',
  'stageId',
  'startDate',
  'dueDate',
  'description',
  'result',
  'assignee',
  'deadlineType',
  'status',
  'conditional',
];

/** Предпросмотр: сравнение текущих данных с импортируемыми по читаемому ID задачи. */
export function previewImport(current: AppSnapshot, incoming: AppSnapshot): ImportPreview {
  const live = (ts: Task[]) => ts.filter((t) => !t.deletedAt);
  const cur = new Map(live(current.tasks).map((t) => [t.id, t]));
  const inc = new Map(live(incoming.tasks).map((t) => [t.id, t]));
  const added: Task[] = [];
  const removed: Task[] = [];
  const changed: ImportPreview['changed'] = [];
  let statusChanges = 0;
  inc.forEach((t, id) => {
    const before = cur.get(id);
    if (!before) {
      added.push(t);
      return;
    }
    const fields = COMPARE_FIELDS.filter((f) => before[f] !== t[f]);
    if (fields.length) changed.push({ before, after: t, fields });
    if (before.status !== t.status) statusChanges += 1;
  });
  cur.forEach((t, id) => {
    if (!inc.has(id)) removed.push(t);
  });
  const settingsChanged = (Object.keys(incoming.settings) as (keyof Settings)[]).filter(
    (k) => current.settings[k] !== incoming.settings[k],
  );
  return {
    added,
    removed,
    changed,
    statusChanges,
    eventsCount: incoming.events.length,
    linksCount: incoming.links.length,
    settingsChanged,
  };
}
