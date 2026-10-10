import { countdown, monthTicks, positionPct } from './timeline';

describe('timeline marker', () => {
  const start = '2026-10-08';
  const end = '2027-01-15';

  it('moves today marker linearly between 08.10.2026 and 15.01.2027', () => {
    expect(positionPct('2026-10-08', start, end)).toBe(0);
    expect(positionPct('2027-01-15', start, end)).toBe(100);
    expect(positionPct('2026-10-10', start, end)).toBeCloseTo((2 / 99) * 100, 6);
    expect(positionPct('2026-11-26', start, end)).toBeCloseTo((49 / 99) * 100, 6);
  });

  it('clamps before start and after end', () => {
    expect(positionPct('2026-09-01', start, end)).toBe(0);
    expect(positionPct('2027-03-01', start, end)).toBe(100);
  });

  it('never shows a negative countdown', () => {
    expect(countdown('2026-10-10', end)).toMatchObject({ kind: 'future', days: 97, label: 'Осталось 97 дней' });
    expect(countdown('2027-01-14', end)).toMatchObject({ kind: 'future', days: 1, label: 'Остался 1 день' });
    expect(countdown('2027-01-15', end)).toMatchObject({ kind: 'today', days: 0 });
    const past = countdown('2027-01-18', end);
    expect(past.kind).toBe('past');
    expect(past.days).toBe(3);
    expect(past.label).toBe('Общий ориентир прошёл 3 дня назад');
  });

  it('builds month ticks inside the range', () => {
    const ticks = monthTicks(start, end);
    expect(ticks.map((t) => t.date)).toEqual(['2026-11-01', '2026-12-01', '2027-01-01']);
  });
});
