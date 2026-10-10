import { compareTaskIds, nextReadableId } from './ids';
import { tasksToCsv } from './csv';
import { filterTasks, EMPTY_FILTER, allAssignees } from './filters';
import { validateTaskInput } from './validation';
import { parseImport, previewImport, buildExport } from './importExport';
import { DEFAULT_SETTINGS } from './types';
import { seedStages, seedTasks } from '@/test/fixtures';

describe('ids', () => {
  it('sorts naturally and generates collision-free readable IDs', () => {
    expect(['3.10', '3.2', '3.1'].sort(compareTaskIds)).toEqual(['3.1', '3.2', '3.10']);
    expect(nextReadableId(3, seedTasks())).toBe('3.11');
    expect(nextReadableId(0, [...seedTasks(), { id: '0.6' }])).toBe('0.7');
  });
});

describe('validation', () => {
  it('requires title, stage, due date and start ≤ due', () => {
    expect(validateTaskInput({})).toMatchObject({ title: expect.any(String), stageId: expect.any(String), dueDate: expect.any(String) });
    expect(validateTaskInput({ title: 'x', stageId: 1, startDate: '2026-11-02', dueDate: '2026-11-01' }).startDate).toBeDefined();
    expect(validateTaskInput({ title: 'x', stageId: 1, startDate: '2026-11-01', dueDate: '2026-11-31' }).dueDate).toBeDefined();
    expect(validateTaskInput({ title: 'x', stageId: 1, startDate: '2026-11-01', dueDate: '2026-11-01' })).toEqual({});
  });
});

describe('filters', () => {
  it('filters by search, owner and deadline type', () => {
    const tasks = seedTasks();
    expect(filterTasks(tasks, { ...EMPTY_FILTER, query: 'duolingo' }).length).toBeGreaterThanOrEqual(5);
    expect(filterTasks(tasks, { ...EMPTY_FILTER, assignee: 'Никита' }).every((t) => t.assignee.includes('Никита'))).toBe(true);
    expect(filterTasks(tasks, { ...EMPTY_FILTER, deadlineType: 'Жёсткий' })).toHaveLength(18);
    expect(filterTasks(tasks, { ...EMPTY_FILTER, stageId: 3 })).toHaveLength(10);
    expect(allAssignees(tasks).slice(0, 2)).toEqual(['Маша', 'Никита']);
  });
});

describe('csv export', () => {
  it('starts with UTF-8 BOM and escapes values', () => {
    const csv = tasksToCsv(seedTasks(), seedStages(), '2026-10-10');
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(50);
    expect(lines[0]).toContain('Дней до дедлайна');
    expect(csv).toContain('1.2;2026-10-13;2026-10-13;Отправить ТЗ агентству');
  });
});

describe('import/export', () => {
  const snapshot = () => ({ tasks: seedTasks(), stages: seedStages(), events: [], settings: DEFAULT_SETTINGS, links: [] });

  it('round-trips an export file through schema validation', () => {
    const file = buildExport(snapshot());
    const res = parseImport(JSON.stringify(file));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.snapshot.tasks).toHaveLength(49);
  });

  it('rejects invalid files with readable errors', () => {
    expect(parseImport('not json').ok).toBe(false);
    const bad = buildExport(snapshot());
    (bad.data.tasks[0] as { dueDate: string }).dueDate = '2026-13-01';
    const res = parseImport(JSON.stringify(bad));
    expect(res.ok).toBe(false);
  });

  it('accepts the seed format from the brief and maps Excel «Отменено»', () => {
    const raw = { stages: seedStages(), tasks: seedTasks().map((t, i) => (i === 3 ? { ...t, status: 'Отменено' } : t)) };
    const res = parseImport(JSON.stringify(raw));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.snapshot.tasks[3].status).toBe('Не требуется');
  });

  it('previews changes before applying', () => {
    const cur = snapshot();
    const inc = snapshot();
    inc.tasks = inc.tasks.filter((t) => t.id !== '8.4');
    inc.tasks[0] = { ...inc.tasks[0], status: 'Не начато' };
    const p = previewImport(cur, inc);
    expect(p.removed.map((t) => t.id)).toEqual(['8.4']);
    expect(p.statusChanges).toBe(1);
    expect(p.changed[0].fields).toEqual(['status']);
  });
});
