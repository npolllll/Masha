import { computeAllStageStats, computeOverall, computeStageStats, focusStageId } from './progress';
import { byId, makeTask, seedStages, seedTasks } from '@/test/fixtures';

const TODAY = '2026-10-10';

describe('initial Excel state', () => {
  it('keeps all 49 tasks with original statuses: 9 Готово, 1 В работе, 39 Не начато', () => {
    const tasks = seedTasks();
    expect(tasks).toHaveLength(49);
    expect(tasks.filter((t) => t.status === 'Готово')).toHaveLength(9);
    expect(tasks.filter((t) => t.status === 'В работе')).toHaveLength(1);
    expect(tasks.filter((t) => t.status === 'Не начато')).toHaveLength(39);
    expect(seedStages()).toHaveLength(9);
  });

  it('reproduces Excel sheet «Этапы» (MINIFS/MAXIFS/COUNTIFS)', () => {
    const stats = computeAllStageStats(seedStages(), seedTasks());
    const rows = stats.map((s) => [s.stage.id, s.startDate, s.endDate, s.total, s.done, s.status]);
    expect(rows).toEqual([
      [0, '2026-10-09', '2026-11-30', 5, 1, 'В работе'],
      [1, '2026-10-08', '2026-10-30', 5, 1, 'В работе'],
      [2, '2026-10-13', '2026-11-20', 5, 0, 'Не начат'],
      [3, '2026-10-13', '2026-12-21', 10, 7, 'В работе'],
      [4, '2026-11-23', '2027-03-31', 6, 0, 'Не начат'],
      [5, '2027-03-01', '2027-05-05', 4, 0, 'Не начат'],
      [6, '2027-03-01', '2027-07-31', 6, 0, 'Не начат'],
      [7, '2027-04-30', '2027-06-30', 4, 0, 'Не начат'],
      [8, '2027-08-01', '2027-09-15', 4, 0, 'Не начат'],
    ]);
    // Excel «Ближайший открытый дедлайн»
    expect(stats.map((s) => s.nearestOpenDeadline)).toEqual([
      '2026-10-31', '2026-10-13', '2026-10-16', '2026-11-27', '2026-12-05', '2027-04-15', '2027-05-15', '2027-05-07', '2027-08-10',
    ]);
    expect(stats[0].pct).toBe(20);
    expect(stats[3].pct).toBe(70);
  });

  it('reproduces Excel «Сводка»', () => {
    const tasks = seedTasks();
    const stats = computeAllStageStats(seedStages(), tasks);
    const o = computeOverall(tasks, stats, TODAY);
    expect(o.total).toBe(49);
    expect(o.done).toBe(9);
    expect(o.inProgress).toBe(1);
    expect(o.overdue).toBe(0);
    expect(o.dueWithin14).toBe(3);
    expect(o.ratio).toBeCloseTo(9 / 49, 10);
    expect(o.pct).toBe(18);
    expect(o.stagesClosed).toBe(0);
    expect(o.hardTotal).toBe(18);
    expect(o.hardOpen).toBe(16);
  });

  it('focus stage = stage with the nearest open deadline', () => {
    expect(focusStageId(computeAllStageStats(seedStages(), seedTasks()))).toBe(1);
  });
});

describe('stage closing rules', () => {
  const stage = { ...seedStages()[0] };

  it('«В работе» is not counted as done', () => {
    const tasks = [makeTask({ stageId: 0, status: 'В работе' }), makeTask({ stageId: 0, status: 'Не начато' })];
    const s = computeStageStats(stage, tasks);
    expect(s.done).toBe(0);
    expect(s.pct).toBe(0);
    expect(s.status).toBe('В работе');
  });

  it('closes only when all applicable tasks are done AND criterion is confirmed', () => {
    const tasks = [makeTask({ stageId: 0, status: 'Готово' }), makeTask({ stageId: 0, status: 'Готово' })];
    const notConfirmed = computeStageStats(stage, tasks);
    expect(notConfirmed.pct).toBe(100);
    expect(notConfirmed.status).toBe('В работе');
    expect(notConfirmed.awaitingConfirmation).toBe(true);
    const confirmed = computeStageStats({ ...stage, criterionConfirmed: true }, tasks);
    expect(confirmed.status).toBe('Закрыт');
  });

  it('excludes «Не требуется» from the denominator (conditional task)', () => {
    const tasks = seedTasks().filter((t) => t.stageId === 0);
    const second = byId(tasks, '0.4');
    second.status = 'Не требуется';
    const s = computeStageStats(stage, tasks);
    expect(s.total).toBe(5);
    expect(s.applicable).toBe(4);
    expect(s.done).toBe(1);
    expect(s.pct).toBe(25);
    expect(s.skipped).toBe(1);
  });

  it('updates the denominator immediately when tasks are added/removed', () => {
    const tasks = seedTasks();
    const before = computeOverall(tasks, [], TODAY);
    const added = [...tasks, makeTask({ stageId: 2, status: 'Не начато' })];
    expect(computeOverall(added, [], TODAY).applicable).toBe(before.applicable + 1);
    const removed = tasks.filter((t) => t.id !== '0.1');
    expect(computeOverall(removed, [], TODAY)).toMatchObject({ applicable: 48, done: 8 });
  });
});
