import { MashaDB } from './db';
import { createRepository } from './repository';
import { parseImport } from '@/domain/importExport';
import { computeAllStageStats, computeOverall } from '@/domain/progress';

let n = 0;
async function freshRepo() {
  const db = new MashaDB(`test-db-${Date.now()}-${n++}`);
  const repo = createRepository(db);
  await repo.ensureReady();
  return repo;
}
const live = async (repo: Awaited<ReturnType<typeof freshRepo>>) => (await repo.db.tasks.toArray()).filter((t) => !t.deletedAt);
const find = async (repo: Awaited<ReturnType<typeof freshRepo>>, id: string) => (await repo.db.tasks.where('id').equals(id).first())!;

describe('repository (IndexedDB)', () => {
  it('seeds once with the original Excel statuses and survives reopen', async () => {
    const name = `persist-${Date.now()}`;
    const db1 = new MashaDB(name);
    const r1 = createRepository(db1);
    await r1.ensureReady();
    expect(await db1.tasks.count()).toBe(49);
    const t = await find(r1, '0.3');
    await r1.toggleDone(t.uid);
    db1.close();

    const db2 = new MashaDB(name);
    const r2 = createRepository(db2);
    await r2.ensureReady();
    const tasks = await db2.tasks.toArray();
    expect(tasks).toHaveLength(49); // не пересеяно
    expect(tasks.filter((x) => x.status === 'Готово')).toHaveLength(10);
    expect((await find(r2, '0.3')).status).toBe('Готово');
    expect((await find(r2, '0.2')).status).toBe('В работе');
    db2.close();
  });

  it('creates tasks with UUID + readable ID, logs events, validates', async () => {
    const repo = await freshRepo();
    const t = await repo.createTask({ title: 'Найти репетитора', stageId: 0, dueDate: '2026-10-20' }, '2026-10-10');
    expect(t.uid).toMatch(/^[0-9a-f-]{36}$/);
    expect(t.id).toBe('0.6');
    expect(t.startDate).toBe('2026-10-10');
    expect(t.assignee).toBe('Маша');
    expect(t.deadlineType).toBe('Плановый');
    expect(t.status).toBe('Не начато');
    const t2 = await repo.createTask({ title: 'Ещё', stageId: 0, startDate: '2026-10-11', dueDate: '2026-10-21' });
    expect(t2.id).toBe('0.7');
    await expect(repo.createTask({ title: '', stageId: 0, dueDate: '2026-10-20' })).rejects.toThrow();
    await expect(repo.createTask({ title: 'x', stageId: 0, startDate: '2026-10-22', dueDate: '2026-10-20' })).rejects.toThrow();
    const events = await repo.db.events.toArray();
    expect(events.filter((e) => e.type === 'created')).toHaveLength(2);
    // знаменатель обновился
    expect((await live(repo)).length).toBe(51);
  });

  it('toggle → Готово, second click restores the previous status', async () => {
    const repo = await freshRepo();
    const t = await find(repo, '0.2'); // В работе
    const r1 = await repo.toggleDone(t.uid);
    expect(r1.completed).toBe(true);
    expect(r1.task.status).toBe('Готово');
    expect(r1.task.completedAt).not.toBeNull();
    const r2 = await repo.toggleDone(t.uid);
    expect(r2.completed).toBe(false);
    expect(r2.task.status).toBe('В работе');
    const ev = (await repo.db.events.toArray()).filter((e) => e.type === 'statusChanged');
    expect(ev.map((e) => [e.changes[0].from, e.changes[0].to])).toEqual([
      ['В работе', 'Готово'],
      ['Готово', 'В работе'],
    ]);
  });

  it('delete is soft, restorable, and keeps IDs unique', async () => {
    const repo = await freshRepo();
    const created = await repo.createTask({ title: 'Временная', stageId: 2, dueDate: '2026-11-01' }, '2026-10-10');
    expect(created.id).toBe('2.6');
    await repo.deleteTask(created.uid);
    expect((await live(repo)).find((t) => t.uid === created.uid)).toBeUndefined();
    const another = await repo.createTask({ title: 'Новая', stageId: 2, dueDate: '2026-11-02' }, '2026-10-10');
    expect(another.id).toBe('2.7'); // без коллизии с удалённой
    await repo.restoreTask(created.uid);
    expect((await live(repo)).find((t) => t.uid === created.uid)?.id).toBe('2.6');
    const types = (await repo.db.events.toArray()).map((e) => e.type);
    expect(types).toEqual(['created', 'deleted', 'created', 'restored']);
    const del = (await repo.db.events.toArray()).find((e) => e.type === 'deleted');
    expect(del?.snapshot?.title).toBe('Временная');
  });

  it('updates fields incl. deadline with old/new values in the log; source IDs are immutable', async () => {
    const repo = await freshRepo();
    const t = await find(repo, '1.2');
    const u = await repo.updateTask(t.uid, { dueDate: '2026-10-14', stageId: 2, status: 'В работе' });
    expect(u.id).toBe('1.2');
    expect(u.dueDate).toBe('2026-10-14');
    expect(u.status).toBe('В работе');
    const events = await repo.db.events.toArray();
    const upd = events.find((e) => e.type === 'updated')!;
    expect(upd.changes).toEqual(
      expect.arrayContaining([
        { field: 'dueDate', from: '2026-10-13', to: '2026-10-14' },
        { field: 'stageId', from: 1, to: 2 },
      ]),
    );
    expect(events.find((e) => e.type === 'statusChanged')?.changes[0]).toEqual({ field: 'status', from: 'Не начато', to: 'В работе' });
    await expect(repo.updateTask(t.uid, { startDate: '2026-12-01' })).rejects.toThrow();
  });

  it('conditional task «Не требуется» is excluded from the denominator', async () => {
    const repo = await freshRepo();
    const t = await find(repo, '0.4');
    expect(t.conditional).toBe(true);
    await repo.setStatus(t.uid, 'Не требуется');
    const stats = computeAllStageStats(await repo.db.stages.toArray(), await live(repo));
    expect(stats[0]).toMatchObject({ applicable: 4, done: 1, pct: 25 });
    const overall = computeOverall(await live(repo), stats, '2026-10-10');
    expect(overall).toMatchObject({ applicable: 48, done: 9 });
  });

  it('stage closes only after manual confirmation', async () => {
    const repo = await freshRepo();
    for (const t of await live(repo)) if (t.stageId === 1 && t.status !== 'Готово') await repo.setStatus(t.uid, 'Готово');
    let stats = computeAllStageStats(await repo.db.stages.toArray(), await live(repo));
    expect(stats[1].status).toBe('В работе');
    expect(stats[1].awaitingConfirmation).toBe(true);
    await repo.setStageConfirmation(1, true);
    stats = computeAllStageStats(await repo.db.stages.toArray(), await live(repo));
    expect(stats[1].status).toBe('Закрыт');
  });

  it('exports, imports (transactional replace) and resets', async () => {
    const repo = await freshRepo();
    const t = await find(repo, '0.3');
    await repo.toggleDone(t.uid);
    await repo.addLink({ title: 'Duolingo', url: 'https://englishtest.duolingo.com', note: '' });
    await repo.updateSettings({ userName: 'Мария', deadline: '2027-01-20' });
    const file = await repo.exportAll();
    expect(file.data.tasks).toHaveLength(49);
    expect(file.data.events.length).toBeGreaterThan(0);

    await repo.resetAll();
    expect((await find(repo, '0.3')).status).toBe('Не начато');
    expect(await repo.db.links.count()).toBe(0);
    expect(await repo.db.events.count()).toBe(0);
    expect((await repo.db.settings.get('app'))?.deadline).toBe('2027-01-15');

    const parsed = parseImport(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    await repo.replaceAll(parsed.snapshot);
    expect((await find(repo, '0.3')).status).toBe('Готово');
    expect(await repo.db.links.count()).toBe(1);
    expect((await repo.db.settings.get('app'))?.userName).toBe('Мария');
  });
});
