import Dexie, { type Table } from 'dexie';
import { DEFAULT_SETTINGS } from '@/domain/types';
import type { LinkItem, Settings, Stage, Task, TaskEvent } from '@/domain/types';
import { SCHEMA_VERSION } from '@/domain/importExport';
import { buildSeedStages, buildSeedTasks } from './seed';

export const DB_NAME = 'masha-psychology-ba-2027';

export interface MetaRow {
  key: string;
  value: unknown;
}

export class MashaDB extends Dexie {
  tasks!: Table<Task, string>;
  stages!: Table<Stage, number>;
  events!: Table<TaskEvent, number>;
  settings!: Table<Settings, string>;
  links!: Table<LinkItem, string>;
  meta!: Table<MetaRow, string>;

  constructor(name = DB_NAME) {
    super(name);
    // Версия схемы IndexedDB. Новые версии добавляются как this.version(N).stores(...).upgrade(...)
    this.version(1).stores({
      tasks: 'uid, id, stageId, status, dueDate',
      stages: 'id',
      events: '++seq, at, taskUid, type',
      settings: 'id',
      links: 'id, createdAt',
      meta: 'key',
    });
    // Seed выполняется РОВНО один раз — при создании новой базы.
    this.on('populate', (tx) => seedInto((name) => tx.table(name)));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableGetter = (name: string) => Table<any, any>;

/** Записывает исходные данные Excel. Вызывается из populate и из «Сброса» внутри транзакции. */
export async function seedInto(t: TableGetter): Promise<void> {
  const now = new Date().toISOString();
  await t('tasks').bulkAdd(buildSeedTasks(now));
  await t('stages').bulkAdd(buildSeedStages());
  await t('settings').put({ ...DEFAULT_SETTINGS });
  await t('meta').bulkPut([
    { key: 'seededAt', value: now },
    { key: 'schemaVersion', value: SCHEMA_VERSION },
  ]);
}

let instance: MashaDB | null = null;

export function getDb(): MashaDB {
  if (!instance) instance = new MashaDB();
  return instance;
}
