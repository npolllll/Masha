import { MashaDB } from './db';
import { createRepository } from './repository';
import { countdown, positionPct } from '@/domain/timeline';
import { classifyTask } from '@/domain/deadlines';
import { buildDailySummary } from '@/domain/summary';

describe('changing deadlines', () => {
  it('control deadline change in settings immediately changes countdown and marker scale', async () => {
    const repo = createRepository(new MashaDB(`settings-${Date.now()}`));
    await repo.ensureReady();
    let s = (await repo.db.settings.get('app'))!;
    expect(s).toMatchObject({ deadline: '2027-01-15', submitTarget: '2027-01-08', planStart: '2026-10-08', timezone: 'Europe/Athens' });
    expect(countdown('2026-10-10', s.deadline).days).toBe(97);
    s = await repo.updateSettings({ deadline: '2027-01-20' });
    expect(countdown('2026-10-10', s.deadline).days).toBe(102);
    expect(positionPct('2026-10-10', s.planStart, s.deadline)).toBeCloseTo((2 / 104) * 100, 6);
    // settings survive reopen
    repo.db.close();
    const repo2 = createRepository(new MashaDB(repo.db.name));
    await repo2.ensureReady();
    expect((await repo2.db.settings.get('app'))?.deadline).toBe('2027-01-20');
  });

  it('task due date change re-classifies the task and the summary', async () => {
    const repo = createRepository(new MashaDB(`due-${Date.now()}`));
    await repo.ensureReady();
    const t = (await repo.db.tasks.where('id').equals('2.1').first())!;
    expect(classifyTask(t, '2026-10-10').bucket).toBe('week');
    // дедлайн раньше старта отклоняется валидацией
    await expect(repo.updateTask(t.uid, { dueDate: '2026-10-10' })).rejects.toThrow();
    const moved = await repo.updateTask(t.uid, { startDate: '2026-10-10', dueDate: '2026-10-10' });
    expect(classifyTask(moved, '2026-10-10').bucket).toBe('today');
    const tasks = await repo.db.tasks.toArray();
    const summary = buildDailySummary(tasks, '2026-10-10');
    expect(summary.facts[0]).toMatchObject({ key: 'today' });
    expect(summary.facts[0].primary.id).toBe('2.1');
  });
});
