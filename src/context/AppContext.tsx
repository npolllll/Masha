import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { todayInTimeZone } from '@/domain/dates';
import { isOpen, sortByDue } from '@/domain/deadlines';
import { computeAllStageStats, computeOverall, planEndDate, type OverallStats, type StageStats } from '@/domain/progress';
import { DEFAULT_SETTINGS } from '@/domain/types';
import type { ISODate, LinkItem, Settings, Stage, Task, TaskEvent, TaskInput, TaskPatch, TaskStatus } from '@/domain/types';
import { ValidationError } from '@/domain/validation';
import { getRepository, type Repository } from '@/storage/repository';
import { fireConfetti } from '@/hooks/confetti';
import { readTodayOverride, useNow } from '@/hooks/useNow';
import type { ConfirmOptions } from '@/components/ui/ConfirmDialog';

export type TaskFormState = { mode: 'create'; prefill?: Partial<TaskInput> } | { mode: 'edit'; task: Task };

interface AppContextValue {
  ready: boolean;
  initError: string | null;
  repo: Repository;
  /** Живые задачи (без удалённых). */
  tasks: Task[];
  /** Все задачи, включая мягко удалённые. */
  allTasks: Task[];
  stages: Stage[];
  stageStats: StageStats[];
  overall: OverallStats;
  events: TaskEvent[];
  links: LinkItem[];
  settings: Settings;
  now: Date;
  today: ISODate;
  todayOverridden: boolean;
  planEnd: ISODate;
  // действия
  toggleDone: (task: Task) => Promise<void>;
  setStatus: (task: Task, status: TaskStatus) => Promise<void>;
  createTask: (input: TaskInput) => Promise<Task | null>;
  updateTask: (task: Task, patch: TaskPatch) => Promise<Task | null>;
  requestDelete: (task: Task) => void;
  restoreTask: (uid: string) => Promise<void>;
  confirmStage: (stageId: number, confirmed: boolean) => Promise<void>;
  updateSettings: (patch: Partial<Settings>, silent?: boolean) => Promise<void>;
  confirm: (options: ConfirmOptions) => void;
  // UI
  taskForm: TaskFormState | null;
  openCreate: (prefill?: Partial<TaskInput>) => void;
  openEdit: (task: Task) => void;
  closeForm: () => void;
  detailsUid: string | null;
  openDetails: (task: Task) => void;
  closeDetails: () => void;
  celebration: Task | null;
  closeCelebration: () => void;
  goToNextTask: () => void;
  history: { taskUid?: string } | null;
  openHistory: (taskUid?: string) => void;
  closeHistory: () => void;
  confirmOptions: ConfirmOptions | null;
  closeConfirm: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const repo = getRepository();

function reportError(e: unknown) {
  if (e instanceof ValidationError) toast.error(e.message);
  else toast.error('Не удалось сохранить изменения', { description: e instanceof Error ? e.message : String(e) });
}

export function AppProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    repo
      .ensureReady()
      .then(() => setReady(true))
      .catch((e) => setInitError(e instanceof Error ? e.message : String(e)));
  }, []);

  // Реактивные запросы IndexedDB: любое изменение в базе мгновенно пересчитывает все экраны.
  const allTasks = useLiveQuery(async () => (ready ? repo.db.tasks.toArray() : undefined), [ready]);
  const stages = useLiveQuery(async () => (ready ? repo.db.stages.orderBy('id').toArray() : undefined), [ready]);
  const events = useLiveQuery(async () => (ready ? repo.db.events.orderBy('seq').reverse().toArray() : undefined), [ready]);
  const settingsRow = useLiveQuery(async () => (ready ? repo.db.settings.get('app') : undefined), [ready]);
  const links = useLiveQuery(async () => (ready ? repo.db.links.orderBy('createdAt').toArray() : undefined), [ready]);

  const now = useNow();
  const settings = settingsRow ?? DEFAULT_SETTINGS;
  const override = useMemo(() => readTodayOverride(), []);
  const today = override ?? todayInTimeZone(now, settings.timezone);

  const tasks = useMemo(() => (allTasks ?? []).filter((t) => !t.deletedAt), [allTasks]);
  const stageStats = useMemo(() => computeAllStageStats(stages ?? [], tasks), [stages, tasks]);
  const overall = useMemo(() => computeOverall(tasks, stageStats, today), [tasks, stageStats, today]);
  const planEnd = useMemo(() => planEndDate(tasks, '2027-09-15'), [tasks]);

  const [taskForm, setTaskForm] = useState<TaskFormState | null>(null);
  const [detailsUid, setDetailsUid] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Task | null>(null);
  const [history, setHistory] = useState<{ taskUid?: string } | null>(null);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null);

  const celebrate = useCallback(
    (task: Task) => {
      if (settings.celebrate) {
        fireConfetti();
        setCelebration(task);
      } else {
        toast.success('Задача выполнена! 🎉', { description: `${task.id} ${task.title}` });
      }
    },
    [settings.celebrate],
  );

  const toggleDone = useCallback(
    async (task: Task) => {
      try {
        const res = await repo.toggleDone(task.uid);
        if (res.completed) celebrate(res.task);
        else toast(`Статус восстановлен: «${res.task.status}»`, { description: `${res.task.id} ${res.task.title}` });
      } catch (e) {
        reportError(e);
      }
    },
    [celebrate],
  );

  const applyStatus = useCallback(
    async (task: Task, status: TaskStatus) => {
      try {
        const next = await repo.setStatus(task.uid, status);
        if (status === 'Готово') celebrate(next);
        else toast.success(`Статус: «${status}»`, { description: `${next.id} ${next.title}` });
      } catch (e) {
        reportError(e);
      }
    },
    [celebrate],
  );

  const setStatus = useCallback(
    async (task: Task, status: TaskStatus) => {
      if (status === task.status) return;
      if (status === 'Не требуется') {
        setConfirmOptions({
          title: 'Пометить «Не требуется»?',
          description: (
            <>
              Задача <b>{task.id}</b> «{task.title}» будет исключена из знаменателя прогресса этапа и общего прогресса.
              Это <b>не</b> выполнение — вернуть статус можно в любой момент.
              {!task.conditional && (
                <span className="mt-2 block text-amber-600">Эта задача не отмечена в плане как условная.</span>
              )}
            </>
          ),
          confirmLabel: 'Да, не требуется',
          onConfirm: () => applyStatus(task, status),
        });
        return;
      }
      await applyStatus(task, status);
    },
    [applyStatus],
  );

  const createTask = useCallback(
    async (input: TaskInput) => {
      try {
        const t = await repo.createTask(input, today);
        toast.success('Задача добавлена', { description: `${t.id} ${t.title}` });
        return t;
      } catch (e) {
        reportError(e);
        return null;
      }
    },
    [today],
  );

  const updateTask = useCallback(
    async (task: Task, patch: TaskPatch) => {
      try {
        const next = await repo.updateTask(task.uid, patch);
        if (patch.status === 'Готово' && task.status !== 'Готово') celebrate(next);
        else toast.success('Изменения сохранены', { description: `${next.id} ${next.title}` });
        return next;
      } catch (e) {
        reportError(e);
        return null;
      }
    },
    [celebrate],
  );

  const restoreTask = useCallback(async (uid: string) => {
    try {
      const t = await repo.restoreTask(uid);
      toast.success('Задача восстановлена', { description: `${t.id} ${t.title}` });
    } catch (e) {
      reportError(e);
    }
  }, []);

  const requestDelete = useCallback(
    (task: Task) => {
      setConfirmOptions({
        title: `Удалить задачу ${task.id}?`,
        description: (
          <>
            «{task.title}» исчезнет из плана, календаря, Гантта и статистики. Удаление можно отменить в уведомлении или в
            «Истории изменений».
          </>
        ),
        confirmLabel: 'Удалить',
        tone: 'danger',
        onConfirm: async () => {
          try {
            await repo.deleteTask(task.uid);
            setDetailsUid((cur) => (cur === task.uid ? null : cur));
            setTaskForm(null);
            toast('Задача удалена', {
              description: `${task.id} ${task.title}`,
              duration: 8000,
              action: { label: 'Отменить', onClick: () => void restoreTask(task.uid) },
            });
          } catch (e) {
            reportError(e);
          }
        },
      });
    },
    [restoreTask],
  );

  const confirmStage = useCallback(async (stageId: number, confirmed: boolean) => {
    try {
      await repo.setStageConfirmation(stageId, confirmed);
      toast.success(confirmed ? 'Условие закрытия подтверждено' : 'Подтверждение снято', { description: `Этап ${stageId}` });
    } catch (e) {
      reportError(e);
    }
  }, []);

  const updateSettings = useCallback(async (patch: Partial<Settings>, silent?: boolean) => {
    try {
      await repo.updateSettings(patch);
      if (!silent) toast.success('Настройки сохранены');
    } catch (e) {
      reportError(e);
    }
  }, []);

  const goToNextTask = useCallback(() => {
    const done = celebration;
    setCelebration(null);
    const next = tasks.filter((t) => isOpen(t) && t.uid !== done?.uid).sort(sortByDue)[0];
    navigate('/tasks', { state: next ? { focusUid: next.uid } : undefined });
  }, [celebration, tasks, navigate]);

  const value: AppContextValue = {
    ready: ready && !!allTasks && !!stages && !!events && !!settingsRow && !!links,
    initError,
    repo,
    tasks,
    allTasks: allTasks ?? [],
    stages: stages ?? [],
    stageStats,
    overall,
    events: events ?? [],
    links: links ?? [],
    settings,
    now,
    today,
    todayOverridden: Boolean(override),
    planEnd,
    toggleDone,
    setStatus,
    createTask,
    updateTask,
    requestDelete,
    restoreTask,
    confirmStage,
    updateSettings,
    confirm: setConfirmOptions,
    taskForm,
    openCreate: (prefill) => setTaskForm({ mode: 'create', prefill }),
    openEdit: (task) => {
      setDetailsUid(null);
      setTaskForm({ mode: 'edit', task });
    },
    closeForm: () => setTaskForm(null),
    detailsUid,
    openDetails: (task) => setDetailsUid(task.uid),
    closeDetails: () => setDetailsUid(null),
    celebration,
    closeCelebration: () => setCelebration(null),
    goToNextTask,
    history,
    openHistory: (taskUid) => {
      setDetailsUid(null);
      setHistory({ taskUid });
    },
    closeHistory: () => setHistory(null),
    confirmOptions,
    closeConfirm: () => setConfirmOptions(null),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function useStageMap(): Map<number, Stage> {
  const { stages } = useApp();
  return useMemo(() => new Map(stages.map((s) => [s.id, s])), [stages]);
}
