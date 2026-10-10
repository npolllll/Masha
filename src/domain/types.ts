/** ISO-дата без времени: 'YYYY-MM-DD'. Семантика — локальная календарная дата. */
export type ISODate = string;

export const TASK_STATUSES = ['Не начато', 'В работе', 'Готово', 'Не требуется'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
/** Три основных состояния. «Не требуется» — отдельное исключение из знаменателя. */
export const MAIN_STATUSES: TaskStatus[] = ['Не начато', 'В работе', 'Готово'];

export const DEADLINE_TYPES = ['Жёсткий', 'Плановый', 'Ориентир'] as const;
export type DeadlineType = (typeof DEADLINE_TYPES)[number];

export type StageStatus = 'Не начат' | 'В работе' | 'Закрыт';

export type TaskSource = 'excel' | 'user';

export interface Task {
  /** Устойчивый UUID (первичный ключ в IndexedDB). */
  uid: string;
  /** Читаемый ID внутри этапа: «0.1», «3.10». Исходные ID неизменны. */
  id: string;
  stageId: number;
  title: string;
  /** Пользовательское описание. */
  description: string;
  /** Ожидаемый результат — колонка «Результат» из Excel. */
  result: string;
  startDate: ISODate;
  dueDate: ISODate;
  assignee: string;
  deadlineType: DeadlineType;
  status: TaskStatus;
  /** Статус до отметки «Готово» — чтобы повторный клик по checkbox восстановил его. */
  prevStatus: TaskStatus | null;
  /** Условная задача («если…») — может быть помечена «Не требуется». */
  conditional: boolean;
  source: TaskSource;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deletedAt: string | null;
}

export interface Stage {
  id: number;
  title: string;
  shortTitle: string;
  completionCriterion: string;
  color: string;
  /** Ручное подтверждение текстового условия закрытия этапа. */
  criterionConfirmed: boolean;
  criterionConfirmedAt: string | null;
}

export interface Settings {
  id: 'app';
  /** Контрольный (общий) дедлайн подачи. */
  deadline: ISODate;
  /** Целевая дата отправки своих заявок. */
  submitTarget: ISODate;
  /** Дата начала плана — левая граница шкалы. */
  planStart: ISODate;
  timezone: string;
  theme: 'light';
  userName: string;
  avatarInitials: string;
  celebrate: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  deadline: '2027-01-15',
  submitTarget: '2027-01-08',
  planStart: '2026-10-08',
  timezone: 'Europe/Athens',
  theme: 'light',
  userName: 'Маша',
  avatarInitials: 'MP',
  celebrate: true,
};

export const EVENT_TYPES = ['created', 'updated', 'statusChanged', 'deleted', 'restored'] as const;
export type TaskEventType = (typeof EVENT_TYPES)[number];

export interface FieldChange {
  field: string;
  from: unknown;
  to: unknown;
}

export interface TaskEvent {
  seq?: number;
  id: string;
  at: string;
  type: TaskEventType;
  taskUid: string;
  taskId: string;
  taskTitle: string;
  changes: FieldChange[];
  /** Снимок задачи на момент удаления — для восстановления. */
  snapshot?: Task;
}

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface EuropeGuideline {
  topic: string;
  period: string;
  description: string;
}

export interface TaskInput {
  title: string;
  stageId: number;
  /** Необязательно: по умолчанию — сегодня. */
  startDate?: ISODate;
  dueDate: ISODate;
  description?: string;
  result?: string;
  assignee?: string;
  deadlineType?: DeadlineType;
  status?: TaskStatus;
  conditional?: boolean;
}

export type TaskPatch = Partial<
  Pick<
    Task,
    | 'title'
    | 'stageId'
    | 'startDate'
    | 'dueDate'
    | 'description'
    | 'result'
    | 'assignee'
    | 'deadlineType'
    | 'status'
    | 'conditional'
  >
>;

export const TASK_FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  title: 'Название',
  stageId: 'Этап',
  startDate: 'Начало',
  dueDate: 'Дедлайн',
  description: 'Описание',
  result: 'Результат',
  assignee: 'Владелец',
  deadlineType: 'Тип срока',
  status: 'Статус',
  conditional: 'Условная',
  deletedAt: 'Удалена',
};
