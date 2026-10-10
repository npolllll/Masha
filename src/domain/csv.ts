import { daysUntilDue } from './deadlines';
import { compareTaskIds } from './ids';
import type { ISODate, Stage, Task } from './types';

const SEP = ';';
const BOM = '﻿';

function cell(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[";\r\n]/.test(s) || s.startsWith(' ') || s.endsWith(' ')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * CSV в UTF-8 с BOM (корректно открывается в Excel). Разделитель «;» — стандарт для
 * русской локали Excel. Колонки повторяют вкладку «Задачи» исходного трекера.
 */
export function tasksToCsv(tasks: Task[], stages: Stage[], today: ISODate): string {
  const stageTitle = new Map(stages.map((s) => [s.id, s.title]));
  const header = [
    '№',
    'Этап',
    'ID',
    'Старт',
    'Дедлайн',
    'Задача',
    'Кто',
    'Тип срока',
    'Статус',
    'Дней до дедлайна',
    'Результат',
    'Описание',
    'Условная',
  ];
  const rows = [...tasks]
    .sort((a, b) => a.stageId - b.stageId || compareTaskIds(a.id, b.id))
    .map((t) => [
      t.stageId,
      stageTitle.get(t.stageId) ?? '',
      t.id,
      t.startDate,
      t.dueDate,
      t.title,
      t.assignee,
      t.deadlineType,
      t.status,
      daysUntilDue(t, today) ?? '',
      t.result,
      t.description,
      t.conditional ? 'да' : '',
    ]);
  return BOM + [header, ...rows].map((r) => r.map(cell).join(SEP)).join('\r\n') + '\r\n';
}
