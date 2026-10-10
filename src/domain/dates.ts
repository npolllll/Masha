import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { ISODate } from './types';

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

export function isValidISODate(value: unknown): value is ISODate {
  if (typeof value !== 'string') return false;
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function parts(iso: ISODate): [number, number, number] {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error(`Некорректная дата: ${iso}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Номер календарного дня (без времени и часовых поясов). */
export function toEpochDay(iso: ISODate): number {
  const [y, m, d] = parts(iso);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function fromEpochDay(day: number): ISODate {
  const dt = new Date(day * DAY_MS);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Разница в календарных днях: b − a. Не зависит от DST и миллисекунд. */
export function daysBetween(a: ISODate, b: ISODate): number {
  return toEpochDay(b) - toEpochDay(a);
}

export function addDays(iso: ISODate, n: number): ISODate {
  return fromEpochDay(toEpochDay(iso) + n);
}

export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minISO(values: ISODate[]): ISODate | null {
  return values.length ? values.reduce((m, v) => (v < m ? v : m)) : null;
}

export function maxISO(values: ISODate[]): ISODate | null {
  return values.length ? values.reduce((m, v) => (v > m ? v : m)) : null;
}

/** Текущая календарная дата в заданной таймзоне (по умолчанию Europe/Athens). */
export function todayInTimeZone(now: Date, timeZone: string): ISODate {
  let fmt: Intl.DateTimeFormat;
  try {
    fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    fmt = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' });
  }
  const p = fmt.formatToParts(now);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/** Время (ЧЧ:ММ) в заданной таймзоне. */
export function timeInTimeZone(now: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', { timeZone, hour: '2-digit', minute: '2-digit' }).format(now);
  } catch {
    return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(now);
  }
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** ISO-дата → локальный Date (полночь) — только для форматирования и календарных сеток. */
export function isoToDate(iso: ISODate): Date {
  const [y, m, d] = parts(iso);
  return new Date(y, m - 1, d);
}

export function dateToISO(date: Date): ISODate {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** «9 октября 2026» */
export const formatLong = (iso: ISODate) => format(isoToDate(iso), 'd MMMM yyyy', { locale: ru });
/** «9 октября» */
export const formatDayMonth = (iso: ISODate) => format(isoToDate(iso), 'd MMMM', { locale: ru });
/** «12 окт.» */
export const formatShort = (iso: ISODate) => format(isoToDate(iso), 'd MMM', { locale: ru });
/** «12 окт. 2026» */
export const formatShortYear = (iso: ISODate) => format(isoToDate(iso), 'd MMM yyyy', { locale: ru });
/** «09.10» */
export const formatDM = (iso: ISODate) => format(isoToDate(iso), 'dd.MM');
/** «09.10.2026» */
export const formatDMY = (iso: ISODate) => format(isoToDate(iso), 'dd.MM.yyyy');
/** «октябрь 2026» */
export const formatMonthYear = (date: Date) => format(date, 'LLLL yyyy', { locale: ru });
/** «окт» */
export const formatMonthShort = (date: Date) => format(date, 'LLL', { locale: ru }).replace('.', '');
/** «пт» */
export const formatWeekdayShort = (iso: ISODate) => format(isoToDate(iso), 'EEEEEE', { locale: ru });

/** «09.10 – 12.10» или «13.10», если начало совпадает с дедлайном. */
export function formatRange(start: ISODate, due: ISODate): string {
  if (start === due) return formatDM(due);
  return `${formatDM(start)} – ${formatDM(due)}`;
}

export function formatDateTime(isoDateTime: string, timeZone?: string): string {
  const d = new Date(isoDateTime);
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toLocaleString('ru-RU');
  }
}

/** Русская плюрализация: plural(3, ['день','дня','дней']) → 'дня'. */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}

export const DAY_FORMS: [string, string, string] = ['день', 'дня', 'дней'];
export const TASK_FORMS: [string, string, string] = ['задача', 'задачи', 'задач'];

export const pluralDays = (n: number) => `${n} ${plural(n, DAY_FORMS)}`;
export const pluralTasks = (n: number) => `${n} ${plural(n, TASK_FORMS)}`;
