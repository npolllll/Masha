import { addDays, daysBetween, formatLong, formatRange, formatShort, isValidISODate, plural, todayInTimeZone } from './dates';

describe('dates', () => {
  it('validates ISO dates strictly', () => {
    expect(isValidISODate('2027-01-15')).toBe(true);
    expect(isValidISODate('2027-02-30')).toBe(false);
    expect(isValidISODate('15.01.2027')).toBe(false);
    expect(isValidISODate('')).toBe(false);
  });

  it('counts calendar days, not milliseconds (DST boundary 25.10.2026)', () => {
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetween('2026-10-10', '2027-01-15')).toBe(97);
    expect(daysBetween('2026-10-08', '2027-01-15')).toBe(99);
    expect(daysBetween('2027-01-15', '2026-10-10')).toBe(-97);
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
  });

  it('computes "today" in Europe/Athens, not UTC', () => {
    // 21:30 UTC 9 Oct = 00:30 10 Oct в Афинах (EEST, UTC+3)
    expect(todayInTimeZone(new Date('2026-10-09T21:30:00Z'), 'Europe/Athens')).toBe('2026-10-10');
    expect(todayInTimeZone(new Date('2026-10-09T20:59:00Z'), 'Europe/Athens')).toBe('2026-10-09');
    // зимнее время (EET, UTC+2)
    expect(todayInTimeZone(new Date('2027-01-14T22:00:00Z'), 'Europe/Athens')).toBe('2027-01-15');
    expect(todayInTimeZone(new Date('2027-01-14T22:00:00Z'), 'UTC')).toBe('2027-01-14');
  });

  it('formats Russian dates', () => {
    expect(formatLong('2026-10-09')).toBe('9 октября 2026');
    expect(formatShort('2026-10-12')).toBe('12 окт.');
    expect(formatRange('2026-10-09', '2026-10-12')).toBe('09.10 – 12.10');
    expect(formatRange('2026-10-13', '2026-10-13')).toBe('13.10');
  });

  it('pluralizes days in Russian', () => {
    expect(plural(1, ['день', 'дня', 'дней'])).toBe('день');
    expect(plural(3, ['день', 'дня', 'дней'])).toBe('дня');
    expect(plural(11, ['день', 'дня', 'дней'])).toBe('дней');
    expect(plural(97, ['день', 'дня', 'дней'])).toBe('дней');
    expect(plural(21, ['день', 'дня', 'дней'])).toBe('день');
  });
});
