import { isValidISODate } from './dates';
import { DEADLINE_TYPES, TASK_STATUSES } from './types';
import type { TaskInput } from './types';

export type TaskErrors = Partial<Record<'title' | 'stageId' | 'startDate' | 'dueDate' | 'deadlineType' | 'status', string>>;

export function validateTaskInput(input: Partial<TaskInput>): TaskErrors {
  const errors: TaskErrors = {};
  if (!input.title || !input.title.trim()) errors.title = 'Введите название задачи';
  else if (input.title.trim().length > 300) errors.title = 'Слишком длинное название (до 300 символов)';
  if (input.stageId === undefined || input.stageId === null || !Number.isInteger(input.stageId) || input.stageId < 0 || input.stageId > 8)
    errors.stageId = 'Выберите этап';
  if (!input.dueDate) errors.dueDate = 'Укажите дедлайн';
  else if (!isValidISODate(input.dueDate)) errors.dueDate = 'Некорректная дата';
  if (input.startDate && !isValidISODate(input.startDate)) errors.startDate = 'Некорректная дата';
  if (!errors.startDate && !errors.dueDate && input.startDate && input.dueDate && input.startDate > input.dueDate)
    errors.startDate = 'Дата начала не может быть позже дедлайна';
  if (input.deadlineType && !DEADLINE_TYPES.includes(input.deadlineType)) errors.deadlineType = 'Неизвестный тип срока';
  if (input.status && !TASK_STATUSES.includes(input.status)) errors.status = 'Неизвестный статус';
  return errors;
}

export class ValidationError extends Error {
  constructor(public errors: TaskErrors) {
    super(Object.values(errors).join('; '));
    this.name = 'ValidationError';
  }
}

export function assertValidTask(input: Partial<TaskInput>): void {
  const errors = validateTaskInput(input);
  if (Object.keys(errors).length) throw new ValidationError(errors);
}
