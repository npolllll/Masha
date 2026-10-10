import { daysBetween, plural, DAY_FORMS } from './dates';
import type { ISODate } from './types';

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Положение даты на шкале [start, end] в процентах, clamp 0..100. */
export function positionPct(date: ISODate, start: ISODate, end: ISODate): number {
  const span = daysBetween(start, end);
  if (span <= 0) return date >= end ? 100 : 0;
  return clamp((daysBetween(start, date) / span) * 100, 0, 100);
}

export interface Countdown {
  kind: 'future' | 'today' | 'past';
  /** Абсолютное количество дней (никогда не отрицательное). */
  days: number;
  /** «Осталось 97 дней» / «Дедлайн сегодня» / «Общий ориентир прошёл 3 дня назад» */
  label: string;
  /** Крупное значение: «97 дней» / «Сегодня» / «3 дня назад» */
  value: string;
}

export function countdown(today: ISODate, deadline: ISODate): Countdown {
  const diff = daysBetween(today, deadline);
  if (diff > 0) {
    const word = plural(diff, DAY_FORMS);
    return {
      kind: 'future',
      days: diff,
      value: `${diff} ${word}`,
      label: `${plural(diff, ['Остался', 'Осталось', 'Осталось'])} ${diff} ${word}`,
    };
  }
  if (diff === 0) return { kind: 'today', days: 0, value: 'Сегодня', label: 'Общий дедлайн — сегодня' };
  const ago = -diff;
  const word = plural(ago, DAY_FORMS);
  return {
    kind: 'past',
    days: ago,
    value: `${ago} ${word} назад`,
    label: `Общий ориентир прошёл ${ago} ${word} назад`,
  };
}

export interface MonthTick {
  date: ISODate;
  pct: number;
  label: string;
  year: number;
  month: number;
}

/** Первые числа месяцев внутри [start, end] для осей. */
export function monthTicks(start: ISODate, end: ISODate): MonthTick[] {
  const res: MonthTick[] = [];
  let [y, m] = start.split('-').map(Number) as [number, number];
  // начинаем с месяца старта (если старт не 1-е число — со следующего месяца)
  if (!start.endsWith('-01')) {
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  for (;;) {
    const iso = `${y}-${String(m).padStart(2, '0')}-01`;
    if (iso > end) break;
    res.push({ date: iso, pct: positionPct(iso, start, end), label: MONTHS[m - 1], year: y, month: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return res;
}
