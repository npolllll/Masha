import { nextReadableId, newUuid } from '@/domain/ids';
import { buildExport, SCHEMA_VERSION, type AppSnapshot, type ExportFile } from '@/domain/importExport';
import { assertValidTask } from '@/domain/validation';
import { DEFAULT_SETTINGS } from '@/domain/types';
import type { FieldChange, LinkItem, Settings, Task, TaskEvent, TaskInput, TaskPatch, TaskStatus } from '@/domain/types';
import { getDb, seedInto, type MashaDB } from './db';

const PATCH_FIELDS: (keyof TaskPatch)[] = [
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

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} не найдено`);
    this.name = 'NotFoundError';
  }
}

export interface ToggleResult {
  task: Task;
  /** true — задача стала «Готово», false — статус восстановлен. */
  completed: boolean;
}

/** Применяет смену статуса с сохранением предыдущего (для undo по checkbox). */
function applyStatus(task: Task, status: TaskStatus, at: string): Task {
  if (task.status === status) return task;
  return {
    ...task,
    status,
    prevStatus: status === 'Готово' ? task.status : null,
    completedAt: status === 'Готово' ? at : null,
    updatedAt: at,
  };
}

export function createRepository(db: MashaDB) {
  const now = () => new Date().toISOString();

  const event = (type: TaskEvent['type'], task: Task, changes: FieldChange[] = [], extra: Partial<TaskEvent> = {}): TaskEvent => ({
    id: newUuid(),
    at: now(),
    type,
    taskUid: task.uid,
    taskId: task.id,
    taskTitle: task.title,
    changes,
    ...extra,
  });

  async function getTaskOrThrow(uid: string): Promise<Task> {
    const t = await db.tasks.get(uid);
    if (!t) throw new NotFoundError('Задача');
    return t;
  }

  return {
    db,

    /** Гарантирует, что база открыта и инициализирована (seed выполняется только для новой базы). */
    async ensureReady(): Promise<void> {
      await db.open();
      const settings = await db.settings.get('app');
      if (!settings) {
        await db.transaction('rw', [db.tasks, db.stages, db.settings, db.meta], async () => {
          const seeded = await db.meta.get('seededAt');
          const count = await db.tasks.count();
          if (!seeded && count === 0) await seedInto((n) => db.table(n));
          else await db.settings.put({ ...DEFAULT_SETTINGS });
        });
      }
    },

    async createTask(input: TaskInput, today?: string): Promise<Task> {
      const startDate = input.startDate || today || input.dueDate;
      const candidate = { ...input, startDate };
      assertValidTask(candidate);
      return db.transaction('rw', db.tasks, db.events, async () => {
        const all = await db.tasks.toArray();
        const at = now();
        const status = input.status ?? 'Не начато';
        const task: Task = {
          uid: newUuid(),
          id: nextReadableId(input.stageId, all),
          stageId: input.stageId,
          title: input.title.trim(),
          description: (input.description ?? '').trim(),
          result: (input.result ?? '').trim(),
          startDate,
          dueDate: input.dueDate,
          assignee: (input.assignee ?? '').trim() || 'Маша',
          deadlineType: input.deadlineType ?? 'Плановый',
          status,
          prevStatus: null,
          conditional: input.conditional ?? false,
          source: 'user',
          createdAt: at,
          updatedAt: at,
          completedAt: status === 'Готово' ? at : null,
          deletedAt: null,
        };
        await db.tasks.add(task);
        await db.events.add(event('created', task, [{ field: 'status', from: null, to: task.status }]));
        return task;
      });
    },

    async updateTask(uid: string, patch: TaskPatch): Promise<Task> {
      return db.transaction('rw', db.tasks, db.events, async () => {
        const before = await getTaskOrThrow(uid);
        const at = now();
        let next: Task = { ...before };
        const changes: FieldChange[] = [];
        for (const f of PATCH_FIELDS) {
          if (!(f in patch) || f === 'status') continue;
          const raw = patch[f];
          const value = typeof raw === 'string' && f !== 'startDate' && f !== 'dueDate' ? raw.trim() : raw;
          if (value === undefined || value === before[f]) continue;
          changes.push({ field: f, from: before[f], to: value });
          next = { ...next, [f]: value } as Task;
        }
        if (!next.assignee) next.assignee = '—';
        // Пользовательская задача при переносе в другой этап получает новый читаемый ID.
        if (next.stageId !== before.stageId && before.source === 'user') {
          const all = await db.tasks.toArray();
          const newId = nextReadableId(next.stageId, all);
          changes.push({ field: 'id', from: before.id, to: newId });
          next.id = newId;
        }
        assertValidTask(next);
        const statusChanged = patch.status !== undefined && patch.status !== before.status;
        if (statusChanged) next = applyStatus(next, patch.status as TaskStatus, at);
        if (!changes.length && !statusChanged) return before;
        next.updatedAt = at;
        await db.tasks.put(next);
        if (changes.length) await db.events.add(event('updated', next, changes));
        if (statusChanged)
          await db.events.add(event('statusChanged', next, [{ field: 'status', from: before.status, to: next.status }]));
        return next;
      });
    },

    async setStatus(uid: string, status: TaskStatus): Promise<Task> {
      return db.transaction('rw', db.tasks, db.events, async () => {
        const before = await getTaskOrThrow(uid);
        if (before.status === status) return before;
        const next = applyStatus(before, status, now());
        await db.tasks.put(next);
        await db.events.add(event('statusChanged', next, [{ field: 'status', from: before.status, to: status }]));
        return next;
      });
    },

    /** Checkbox: → «Готово»; повторный клик восстанавливает предыдущее состояние. */
    async toggleDone(uid: string): Promise<ToggleResult> {
      return db.transaction('rw', db.tasks, db.events, async () => {
        const before = await getTaskOrThrow(uid);
        const at = now();
        let next: Task;
        let completed: boolean;
        if (before.status === 'Готово') {
          const restore: TaskStatus = before.prevStatus && before.prevStatus !== 'Готово' ? before.prevStatus : 'Не начато';
          next = { ...before, status: restore, prevStatus: null, completedAt: null, updatedAt: at };
          completed = false;
        } else {
          next = applyStatus(before, 'Готово', at);
          completed = true;
        }
        await db.tasks.put(next);
        await db.events.add(event('statusChanged', next, [{ field: 'status', from: before.status, to: next.status }]));
        return { task: next, completed };
      });
    },

    /** Мягкое удаление: задача остаётся в базе (для undo и истории). */
    async deleteTask(uid: string): Promise<Task> {
      return db.transaction('rw', db.tasks, db.events, async () => {
        const before = await getTaskOrThrow(uid);
        if (before.deletedAt) return before;
        const at = now();
        const next = { ...before, deletedAt: at, updatedAt: at };
        await db.tasks.put(next);
        await db.events.add(event('deleted', before, [{ field: 'deletedAt', from: null, to: at }], { snapshot: before }));
        return next;
      });
    },

    async restoreTask(uid: string): Promise<Task> {
      return db.transaction('rw', db.tasks, db.events, async () => {
        const before = await getTaskOrThrow(uid);
        if (!before.deletedAt) return before;
        const next = { ...before, deletedAt: null, updatedAt: now() };
        await db.tasks.put(next);
        await db.events.add(event('restored', next, [{ field: 'deletedAt', from: before.deletedAt, to: null }]));
        return next;
      });
    },

    async setStageConfirmation(stageId: number, confirmed: boolean): Promise<void> {
      await db.stages.update(stageId, {
        criterionConfirmed: confirmed,
        criterionConfirmedAt: confirmed ? now() : null,
      });
    },

    async updateSettings(patch: Partial<Settings>): Promise<Settings> {
      return db.transaction('rw', db.settings, async () => {
        const cur = (await db.settings.get('app')) ?? DEFAULT_SETTINGS;
        const next: Settings = { ...cur, ...patch, id: 'app', theme: 'light' };
        await db.settings.put(next);
        return next;
      });
    },

    async addLink(input: Pick<LinkItem, 'title' | 'url' | 'note'>): Promise<LinkItem> {
      const at = now();
      const link: LinkItem = { id: newUuid(), title: input.title.trim(), url: input.url.trim(), note: input.note.trim(), createdAt: at, updatedAt: at };
      await db.links.add(link);
      return link;
    },

    async updateLink(id: string, patch: Partial<Pick<LinkItem, 'title' | 'url' | 'note'>>): Promise<void> {
      await db.links.update(id, { ...patch, updatedAt: now() });
    },

    async deleteLink(id: string): Promise<void> {
      await db.links.delete(id);
    },

    async snapshot(): Promise<AppSnapshot> {
      return db.transaction('r', [db.tasks, db.stages, db.events, db.settings, db.links], async () => ({
        tasks: await db.tasks.toArray(),
        stages: await db.stages.orderBy('id').toArray(),
        events: await db.events.orderBy('seq').toArray(),
        settings: (await db.settings.get('app')) ?? DEFAULT_SETTINGS,
        links: await db.links.toArray(),
      }));
    },

    async exportAll(): Promise<ExportFile> {
      return buildExport(await this.snapshot());
    },

    /** Импорт: полная транзакционная замена данных (после предпросмотра в UI). */
    async replaceAll(snapshot: AppSnapshot): Promise<void> {
      await db.transaction('rw', [db.tasks, db.stages, db.events, db.settings, db.links, db.meta], async () => {
        await Promise.all([db.tasks.clear(), db.stages.clear(), db.events.clear(), db.links.clear()]);
        await db.tasks.bulkAdd(snapshot.tasks);
        await db.stages.bulkAdd(snapshot.stages);
        await db.events.bulkAdd(snapshot.events.map(({ seq: _seq, ...e }) => e));
        await db.settings.put({ ...snapshot.settings, id: 'app' });
        await db.links.bulkAdd(snapshot.links);
        await db.meta.bulkPut([
          { key: 'importedAt', value: now() },
          { key: 'schemaVersion', value: SCHEMA_VERSION },
        ]);
      });
    },

    /** Полный сброс к исходным данным Excel. */
    async resetAll(): Promise<void> {
      await db.transaction('rw', [db.tasks, db.stages, db.events, db.settings, db.links, db.meta], async () => {
        await Promise.all([
          db.tasks.clear(),
          db.stages.clear(),
          db.events.clear(),
          db.settings.clear(),
          db.links.clear(),
          db.meta.clear(),
        ]);
        await seedInto((n) => db.table(n));
      });
    },

    async getMeta(key: string): Promise<unknown> {
      return (await db.meta.get(key))?.value;
    },
  };
}

export type Repository = ReturnType<typeof createRepository>;

let repo: Repository | null = null;

export function getRepository(): Repository {
  if (!repo) repo = createRepository(getDb());
  return repo;
}
