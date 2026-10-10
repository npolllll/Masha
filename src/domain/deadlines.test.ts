import { classifyTask, daysUntilDue, deadlineTone, openHardDeadlines, relativeDeadlineLabel, upcomingTasks } from './deadlines';
import { makeTask, seedTasks } from '@/test/fixtures';

const TODAY = '2026-10-10';

describe('deadline classification', () => {
  it('classifies boundaries correctly', () => {
    const c = (due: string, start = '2026-10-01') => classifyTask(makeTask({ startDate: start, dueDate: due }), TODAY);
    expect(c('2026-10-09').bucket).toBe('overdue');
    expect(c('2026-10-10').bucket).toBe('today');
    expect(c('2026-10-11').bucket).toBe('tomorrow');
    expect(c('2026-10-12').bucket).toBe('soon');
    expect(c('2026-10-13').bucket).toBe('soon');
    expect(c('2026-10-14').bucket).toBe('week');
    expect(c('2026-10-18').bucket).toBe('later');
    expect(c('2026-10-12', '2026-10-10').active).toBe(true);
    expect(c('2026-10-20', '2026-10-11').future).toBe(true);
    expect(c('2026-10-20', '2026-10-11').active).toBe(false);
  });

  it('completed tasks never produce warnings', () => {
    const done = makeTask({ dueDate: '2026-10-01', status: 'Готово' });
    expect(classifyTask(done, TODAY).bucket).toBe('done');
    expect(daysUntilDue(done, TODAY)).toBeNull();
    expect(deadlineTone(done, TODAY)).toBe('done');
  });

  it('labels relative deadlines', () => {
    expect(relativeDeadlineLabel(makeTask({ dueDate: '2026-10-13' }), TODAY)).toBe('Через 3 дня');
    expect(relativeDeadlineLabel(makeTask({ dueDate: '2026-10-10' }), TODAY)).toBe('Сегодня');
    expect(relativeDeadlineLabel(makeTask({ dueDate: '2026-10-11' }), TODAY)).toBe('Завтра');
    expect(relativeDeadlineLabel(makeTask({ dueDate: '2026-10-05' }), TODAY)).toBe('Просрочено на 5 дней');
  });

  it('derives the hard-deadline list like Excel FILTER/SORT', () => {
    const list = openHardDeadlines(seedTasks());
    expect(list).toHaveLength(16);
    expect(list.slice(0, 4).map((t) => t.id)).toEqual(['1.2', '1.3', '0.3', '2.2']);
    expect(list.map((t) => daysUntilDue(t, TODAY)).slice(0, 3)).toEqual([3, 17, 23]);
    expect(list.at(-1)?.id).toBe('8.3');
  });

  it('upcoming tasks for the home page', () => {
    const list = upcomingTasks(seedTasks(), TODAY);
    expect(list.map((t) => t.id)).toEqual(['1.2', '2.1', '1.4']);
  });
});
