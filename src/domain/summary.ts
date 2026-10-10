import { addDays, daysBetween, formatShort, plural, pluralTasks, DAY_FORMS } from './dates';
import { classifyTask, isHard, isOpen, sortByDue } from './deadlines';
import type { ISODate, Task } from './types';

/**
 * Детерминированное ежедневное summary без LLM и сетевых запросов.
 * Приоритет (ТЗ): 1 просроченные жёсткие → 2 жёсткие сегодня → 3 остальные сегодня →
 * (просроченные остальные) → 4 завтра → 5 через 2–3 дня → 6 в работе → 7 скоро старт → 8 спокойно.
 */
export type SummaryFactKey =
  | 'overdueHard'
  | 'hardToday'
  | 'today'
  | 'overdue'
  | 'tomorrow'
  | 'soon'
  | 'inProgress'
  | 'startingSoon';

export type SummaryTone = 'alert' | 'warm' | 'calm' | 'done';

export interface SummaryFact {
  key: SummaryFactKey;
  priority: number;
  tone: SummaryTone;
  /** Короткая подпись: «Через 3 дня», «В работе». */
  label: string;
  /** Тёплое сообщение-заголовок. */
  message: string;
  /** Подробность: «Ближайшая: 1.2 Отправить ТЗ агентству…» */
  detail: string;
  tasks: Task[];
  primary: Task;
  /** Дата, к которой относится факт (дедлайн или старт). */
  date: ISODate;
}

export interface DailySummary {
  headline: string;
  tone: SummaryTone;
  /** 1–3 наиболее важных факта. */
  facts: SummaryFact[];
  allFacts: SummaryFact[];
  primaryTask: Task | null;
  primaryDate: ISODate | null;
  counts: {
    overdue: number;
    overdueHard: number;
    today: number;
    tomorrow: number;
    soon: number;
    active: number;
    inProgress: number;
    startingSoon: number;
    open: number;
  };
}

const STARTING_SOON_DAYS = 7;

function head(tasks: Task[]): Task {
  return tasks[0];
}

function taskLine(t: Task): string {
  return `${t.id} ${t.title}`;
}

function countPrefix(n: number): string {
  return n > 1 ? ` (${pluralTasks(n)})` : '';
}

export function buildDailySummary(tasks: Task[], today: ISODate): DailySummary {
  const open = tasks.filter(isOpen);
  const info = new Map(open.map((t) => [t.uid, classifyTask(t, today)]));
  const by = (pred: (t: Task) => boolean) => open.filter(pred).sort(sortByDue);

  const overdueHard = by((t) => info.get(t.uid)!.bucket === 'overdue' && isHard(t));
  const overdueOther = by((t) => info.get(t.uid)!.bucket === 'overdue' && !isHard(t));
  const hardToday = by((t) => info.get(t.uid)!.bucket === 'today' && isHard(t));
  const otherToday = by((t) => info.get(t.uid)!.bucket === 'today' && !isHard(t));
  const tomorrow = by((t) => info.get(t.uid)!.bucket === 'tomorrow');
  const soon = by((t) => info.get(t.uid)!.bucket === 'soon');
  const active = by((t) => info.get(t.uid)!.active);
  // «В работе» = статус «В работе» ИЛИ активный период start ≤ today ≤ due
  const inProgress = by((t) => t.status === 'В работе' || info.get(t.uid)!.active);
  const startLimit = addDays(today, STARTING_SOON_DAYS);
  const inProgressIds = new Set(inProgress.map((t) => t.uid));
  const startingSoon = open
    .filter((t) => t.startDate > today && t.startDate <= startLimit && !inProgressIds.has(t.uid))
    .sort((a, b) => (a.startDate === b.startDate ? sortByDue(a, b) : a.startDate < b.startDate ? -1 : 1));

  const facts: SummaryFact[] = [];

  if (overdueHard.length) {
    const t = head(overdueHard);
    const ago = -daysBetween(today, t.dueDate);
    facts.push({
      key: 'overdueHard',
      priority: 1,
      tone: 'alert',
      label: `Просрочено жёстких: ${overdueHard.length}`,
      message: 'Эта дата уже прошла — давай посмотрим, что осталось',
      detail: `${taskLine(t)} — срок был ${formatShort(t.dueDate)} (${ago} ${plural(ago, DAY_FORMS)} назад)`,
      tasks: overdueHard,
      primary: t,
      date: t.dueDate,
    });
  }
  if (hardToday.length) {
    const t = head(hardToday);
    facts.push({
      key: 'hardToday',
      priority: 2,
      tone: 'alert',
      label: `Жёсткий срок сегодня${countPrefix(hardToday.length)}`,
      message: 'Сегодня есть важная задачка — давай закроем её 💗',
      detail: taskLine(t),
      tasks: hardToday,
      primary: t,
      date: t.dueDate,
    });
  }
  if (otherToday.length) {
    const t = head(otherToday);
    facts.push({
      key: 'today',
      priority: 3,
      tone: 'warm',
      label: `Срок сегодня${countPrefix(otherToday.length)}`,
      message:
        otherToday.length > 1
          ? `Сегодня ${pluralTasks(otherToday.length)} со сроком — давай закроем их 💗`
          : 'Сегодня есть задачка — давай закроем её 💗',
      detail: taskLine(t),
      tasks: otherToday,
      primary: t,
      date: t.dueDate,
    });
  }
  if (overdueOther.length) {
    const t = head(overdueOther);
    const ago = -daysBetween(today, t.dueDate);
    facts.push({
      key: 'overdue',
      priority: 3.5,
      tone: 'alert',
      label: `Просрочено: ${overdueOther.length}`,
      message: 'Эта дата уже прошла — давай посмотрим, что осталось',
      detail: `${taskLine(t)} — срок был ${formatShort(t.dueDate)} (${ago} ${plural(ago, DAY_FORMS)} назад)`,
      tasks: overdueOther,
      primary: t,
      date: t.dueDate,
    });
  }
  if (tomorrow.length) {
    const t = head(tomorrow);
    facts.push({
      key: 'tomorrow',
      priority: 4,
      tone: 'warm',
      label: `Завтра${countPrefix(tomorrow.length)}`,
      message: tomorrow.some(isHard) ? 'Завтра важный дедлайн. Всё успеем ✨' : 'Завтра небольшой дедлайн. Всё успеем ✨',
      detail: taskLine(t),
      tasks: tomorrow,
      primary: t,
      date: t.dueDate,
    });
  }
  if (soon.length) {
    const t = head(soon);
    const d = daysBetween(today, t.dueDate);
    facts.push({
      key: 'soon',
      priority: 5,
      tone: 'warm',
      label: `Через ${d} ${plural(d, DAY_FORMS)}${countPrefix(soon.length)}`,
      message: `Через ${d} ${plural(d, DAY_FORMS)} дедлайн — можно потихоньку готовиться`,
      detail: taskLine(t),
      tasks: soon,
      primary: t,
      date: t.dueDate,
    });
  }
  if (inProgress.length) {
    const t = head(inProgress);
    facts.push({
      key: 'inProgress',
      priority: 6,
      tone: 'calm',
      label: `В работе: ${inProgress.length}`,
      message: 'Срочных дедлайнов нет. Можно спокойно двигаться по плану 🌷',
      detail: `${taskLine(t)} — до ${formatShort(t.dueDate)}`,
      tasks: inProgress,
      primary: t,
      date: t.dueDate,
    });
  }
  if (startingSoon.length) {
    const t = startingSoon[0];
    const d = daysBetween(today, t.startDate);
    facts.push({
      key: 'startingSoon',
      priority: 7,
      tone: 'calm',
      label: `Скоро старт: ${startingSoon.length}`,
      message: 'Срочных дедлайнов нет. Можно спокойно двигаться по плану 🌷',
      detail: `${taskLine(t)} — старт ${d === 1 ? 'завтра' : `через ${d} ${plural(d, DAY_FORMS)}`}`,
      tasks: startingSoon,
      primary: t,
      date: t.startDate,
    });
  }

  facts.sort((a, b) => a.priority - b.priority);
  const top = facts[0];
  let headline: string;
  let tone: SummaryTone;
  if (top) {
    headline = top.message;
    tone = top.tone;
  } else if (open.length === 0 && tasks.length > 0) {
    headline = 'Все задачи выполнены — можно выдохнуть и гордиться собой 🌷';
    tone = 'done';
  } else {
    headline = 'Срочных дедлайнов нет. Можно спокойно двигаться по плану 🌷';
    tone = 'calm';
  }

  // Если срочного нет — показываем ближайшую открытую задачу, а не «нет задач».
  let primaryTask = top?.primary ?? null;
  let primaryDate = top?.date ?? null;
  if (!primaryTask && open.length) {
    primaryTask = [...open].sort(sortByDue)[0];
    primaryDate = primaryTask.dueDate;
  }

  return {
    headline,
    tone,
    facts: facts.slice(0, 3),
    allFacts: facts,
    primaryTask,
    primaryDate,
    counts: {
      overdue: overdueHard.length + overdueOther.length,
      overdueHard: overdueHard.length,
      today: hardToday.length + otherToday.length,
      tomorrow: tomorrow.length,
      soon: soon.length,
      active: active.length,
      inProgress: inProgress.length,
      startingSoon: startingSoon.length,
      open: open.length,
    },
  };
}
