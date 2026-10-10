import { buildDailySummary } from './summary';
import { makeTask, seedTasks } from '@/test/fixtures';

describe('daily summary', () => {
  it('on 10.10.2026 (Excel snapshot) highlights 1.2 in 3 days, then work in progress', () => {
    const s = buildDailySummary(seedTasks(), '2026-10-10');
    expect(s.facts[0].key).toBe('soon');
    expect(s.facts[0].primary.id).toBe('1.2');
    expect(s.headline).toBe('Через 3 дня дедлайн — можно потихоньку готовиться');
    expect(s.facts.map((f) => f.key)).toEqual(['soon', 'inProgress', 'startingSoon']);
    expect(s.facts[1].primary.id).toBe('0.2');
    expect(s.counts.overdue).toBe(0);
  });

  it('prioritises overdue hard deadlines first', () => {
    const tasks = [
      makeTask({ id: '1.1', dueDate: '2026-10-11' }),
      makeTask({ id: '1.2', dueDate: '2026-10-05', deadlineType: 'Жёсткий' }),
      makeTask({ id: '1.3', dueDate: '2026-10-10', deadlineType: 'Жёсткий' }),
    ];
    const s = buildDailySummary(tasks, '2026-10-10');
    expect(s.facts.map((f) => f.key)).toEqual(['overdueHard', 'hardToday', 'tomorrow']);
    expect(s.headline).toBe('Эта дата уже прошла — давай посмотрим, что осталось');
  });

  it('hard today beats other today; tomorrow message', () => {
    const s = buildDailySummary(
      [makeTask({ id: 'a', dueDate: '2026-10-10' }), makeTask({ id: 'b', dueDate: '2026-10-10', deadlineType: 'Жёсткий' })],
      '2026-10-10',
    );
    expect(s.facts[0].key).toBe('hardToday');
    expect(s.headline).toBe('Сегодня есть важная задачка — давай закроем её 💗');
    const t = buildDailySummary([makeTask({ dueDate: '2026-10-11' })], '2026-10-10');
    expect(t.headline).toBe('Завтра небольшой дедлайн. Всё успеем ✨');
  });

  it('never says "no tasks" when an active task exists', () => {
    const s = buildDailySummary([makeTask({ startDate: '2026-10-01', dueDate: '2026-10-30' })], '2026-10-10');
    expect(s.facts[0].key).toBe('inProgress');
    expect(s.headline).not.toMatch(/нет задач/i);
    expect(s.primaryTask).not.toBeNull();
  });

  it('calm state still points to the next task', () => {
    const s = buildDailySummary([makeTask({ startDate: '2026-12-01', dueDate: '2026-12-10' })], '2026-10-10');
    expect(s.facts).toHaveLength(0);
    expect(s.headline).toBe('Срочных дедлайнов нет. Можно спокойно двигаться по плану 🌷');
    expect(s.primaryTask?.dueDate).toBe('2026-12-10');
  });

  it('does not claim completion until status is Готово', () => {
    const s = buildDailySummary([makeTask({ status: 'В работе', dueDate: '2026-10-10' })], '2026-10-10');
    expect(s.tone).not.toBe('done');
    const d = buildDailySummary([makeTask({ status: 'Готово' })], '2026-10-10');
    expect(d.tone).toBe('done');
  });

  it('recalculates when the date changes', () => {
    const tasks = seedTasks();
    expect(buildDailySummary(tasks, '2026-10-12').facts[0].primary.id).toBe('1.2'); // завтра
    expect(buildDailySummary(tasks, '2026-10-13').facts[0].key).toBe('hardToday');
    expect(buildDailySummary(tasks, '2026-10-14').facts[0].key).toBe('overdueHard');
  });
});
