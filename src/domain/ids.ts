import type { Task } from './types';

/** Естественная сортировка ID: 3.2 < 3.10. */
export function compareTaskIds(a: string, b: string): number {
  const pa = a.split('.').map((x) => Number.parseInt(x, 10));
  const pb = b.split('.').map((x) => Number.parseInt(x, 10));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const x = Number.isNaN(pa[i]) ? -1 : (pa[i] ?? -1);
    const y = Number.isNaN(pb[i]) ? -1 : (pb[i] ?? -1);
    if (x !== y) return x - y;
  }
  return a.localeCompare(b);
}

/**
 * Следующий читаемый ID внутри этапа без коллизий.
 * Учитываются ВСЕ задачи, включая удалённые, — чтобы восстановление не дало дубликат.
 */
export function nextReadableId(stageId: number, allTasks: Pick<Task, 'id'>[]): string {
  const prefix = `${stageId}.`;
  let max = 0;
  for (const t of allTasks) {
    if (!t.id.startsWith(prefix)) continue;
    const n = Number.parseInt(t.id.slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  const taken = new Set(allTasks.map((t) => t.id));
  let candidate = max + 1;
  while (taken.has(`${prefix}${candidate}`)) candidate += 1;
  return `${prefix}${candidate}`;
}

export function newUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
  // RFC4122 v4 fallback
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
