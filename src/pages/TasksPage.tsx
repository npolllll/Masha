import { CalendarDays, GanttChart, History, List, Plus, SearchX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { formatLong, pluralTasks } from '@/domain/dates';
import { sortByDue } from '@/domain/deadlines';
import { allAssignees, EMPTY_FILTER, filterTasks, isFilterActive, sortTasks, type SortMode, type TaskFilter } from '@/domain/filters';
import { DEADLINE_TYPES, TASK_STATUSES } from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { SearchField, Segmented, SelectField } from '@/components/ui/Fields';
import { EmptyState, PageHeader } from '@/components/ui/Misc';
import { cn } from '@/components/ui/cn';
import { CalendarView } from '@/components/tasks/CalendarView';
import { GanttView } from '@/components/tasks/GanttView';
import { StageListView, type StageGroup } from '@/components/tasks/StageListView';

type View = 'list' | 'calendar' | 'gantt';
const VIEW_KEY = 'masha:tasks-view';
const COLLAPSE_KEY = 'masha:collapsed-stages';

function readLocal<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* хранилище недоступно — работаем без него */
  }
}

export function TasksPage() {
  const { tasks, stageStats, stages, today, openCreate, openHistory } = useApp();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const stageParam = params.get('stage');
  const stageFilter: number | 'all' = stageParam !== null && /^[0-8]$/.test(stageParam) ? Number(stageParam) : 'all';
  const viewParam = params.get('view') as View | null;
  const [view, setViewState] = useState<View>(() =>
    viewParam && ['list', 'calendar', 'gantt'].includes(viewParam) ? viewParam : readLocal<View>(VIEW_KEY, 'list'),
  );
  const [filter, setFilter] = useState<Omit<TaskFilter, 'stageId'>>({ ...EMPTY_FILTER });
  const [sort, setSort] = useState<SortMode>('id');
  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set(readLocal<number[]>(COLLAPSE_KEY, [])));
  const [flashUid, setFlashUid] = useState<string | null>(null);

  const setView = (v: View) => {
    setViewState(v);
    writeLocal(VIEW_KEY, v);
    if (params.has('view')) {
      const p = new URLSearchParams(params);
      p.delete('view');
      setParams(p, { replace: true });
    }
  };

  const setStage = (s: number | 'all') => {
    const p = new URLSearchParams(params);
    if (s === 'all') p.delete('stage');
    else p.set('stage', String(s));
    setParams(p, { replace: true });
  };

  const toggleCollapse = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeLocal(COLLAPSE_KEY, [...next]);
      return next;
    });

  // «Перейти к следующей» из поздравления: подсветить и прокрутить к задаче
  useEffect(() => {
    const focusUid = (location.state as { focusUid?: string } | null)?.focusUid;
    if (!focusUid) return;
    const task = tasks.find((t) => t.uid === focusUid);
    navigate(location.pathname + location.search, { replace: true, state: null });
    if (!task) return;
    setView('list');
    setFilter({ ...EMPTY_FILTER });
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.delete(task.stageId);
      return next;
    });
    if (stageFilter !== 'all' && stageFilter !== task.stageId) setStage(task.stageId);
    setFlashUid(focusUid);
    window.setTimeout(() => document.getElementById(`task-${focusUid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    window.setTimeout(() => setFlashUid(null), 3400);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const fullFilter: TaskFilter = { ...filter, stageId: stageFilter };
  const filtered = useMemo(() => sortTasks(filterTasks(tasks, fullFilter), sort), [tasks, fullFilter.query, fullFilter.status, fullFilter.assignee, fullFilter.deadlineType, fullFilter.stageId, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const active = isFilterActive(fullFilter);
  const owners = useMemo(() => allAssignees(tasks), [tasks]);

  const groups: StageGroup[] = useMemo(
    () =>
      stageStats
        .filter((s) => stageFilter === 'all' || s.stage.id === stageFilter)
        .map((s) => ({ stats: s, tasks: filtered.filter((t) => t.stageId === s.stage.id) }))
        .filter((g) => !active || g.tasks.length > 0 || stageFilter !== 'all'),
    [stageStats, filtered, stageFilter, active],
  );

  const calendarStart = useMemo(() => {
    if (stageFilter === 'all') return undefined;
    const open = filtered.filter((t) => t.status !== 'Готово').sort(sortByDue)[0];
    return open?.dueDate ?? filtered[0]?.dueDate;
  }, [filtered, stageFilter]);

  return (
    <div>
      <PageHeader
        title="План и задачи"
        subtitle="Полная временная шкала поступления. Все даты и задачи обновляются автоматически."
        actions={
          <>
            <Button variant="outline" onClick={() => openHistory()}>
              <History className="h-4 w-4" /> История
            </Button>
            <Button onClick={() => openCreate(stageFilter === 'all' ? undefined : { stageId: stageFilter })}>
              <Plus className="h-4 w-4" strokeWidth={2.5} /> Добавить задачу
            </Button>
          </>
        }
      />

      <div className="-mx-4 mb-5 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Фильтр по этапам" className="inline-flex min-w-max gap-1 rounded-2xl bg-[#EFF1F5] p-1.5">
          {(['all', 0, 1, 2, 3, 4, 5, 6, 7, 8] as const).map((s) => {
            const selected = stageFilter === s;
            const st = s === 'all' ? null : stages[s];
            return (
              <button
                key={String(s)}
                type="button"
                role="tab"
                aria-selected={selected}
                title={st ? `Этап ${s}. ${st.title}` : 'Все этапы'}
                onClick={() => setStage(s)}
                className={cn(
                  'relative h-10 whitespace-nowrap rounded-xl px-4 text-[13.5px] font-medium transition',
                  selected ? 'bg-white text-rose-600 shadow-[0_1px_3px_rgba(24,32,51,0.08)]' : 'text-ink-soft hover:bg-white/60 hover:text-ink',
                )}
              >
                {s === 'all' ? 'Все этапы' : `Этап ${s}`}
                {selected && <span className="absolute inset-x-3 -bottom-1.5 h-[3px] rounded-full bg-rose-500" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-muted" aria-live="polite">
          {stageFilter !== 'all' && stages[stageFilter] && (
            <span className="mr-2 font-semibold text-ink">
              Этап {stageFilter}. {stages[stageFilter].title} ·
            </span>
          )}
          Показано {pluralTasks(filtered.length)} из {tasks.length} · сегодня {formatLong(today)}
        </p>
        <Segmented
          label="Вид"
          value={view}
          onChange={setView}
          options={[
            { value: 'list', label: 'Список', icon: <List className="h-4 w-4" /> },
            { value: 'calendar', label: 'Календарь', icon: <CalendarDays className="h-4 w-4" /> },
            { value: 'gantt', label: 'Гантт', icon: <GanttChart className="h-4 w-4" /> },
          ]}
        />
      </div>

      <div className="card mb-5 grid grid-cols-2 gap-2.5 p-3 sm:gap-3 lg:grid-cols-[minmax(220px,1.6fr)_repeat(4,minmax(140px,1fr))_auto]">
        <SearchField className="col-span-2 lg:col-span-1" value={filter.query} onChange={(q) => setFilter((f) => ({ ...f, query: q }))} placeholder="Поиск задач…" />
        <SelectField aria-label="Статус" value={filter.status} onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value as TaskFilter['status'] }))}>
          <option value="all">Все статусы</option>
          <option value="open">Открытые</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </SelectField>
        <SelectField aria-label="Владелец" value={filter.assignee} onChange={(e) => setFilter((f) => ({ ...f, assignee: e.target.value }))}>
          <option value="all">Все владельцы</option>
          {owners.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </SelectField>
        <SelectField
          aria-label="Тип срока"
          value={filter.deadlineType}
          onChange={(e) => setFilter((f) => ({ ...f, deadlineType: e.target.value as TaskFilter['deadlineType'] }))}
        >
          <option value="all">Все типы сроков</option>
          {DEADLINE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </SelectField>
        <SelectField aria-label="Сортировка" value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
          <option value="id">По ID</option>
          <option value="due">По сроку ↑</option>
          <option value="dueDesc">По сроку ↓</option>
          <option value="start">По дате начала</option>
        </SelectField>
        <Button variant="ghost" className="col-span-2 lg:col-span-1" disabled={!active && sort === 'id'} onClick={() => (setFilter({ ...EMPTY_FILTER }), setSort('id'))}>
          Сбросить
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Plus className="h-6 w-6" />}
            title="Задач пока нет"
            action={<Button onClick={() => openCreate()}>Добавить первую задачу</Button>}
          >
            Все задачи удалены. Восстановить их можно в «Истории изменений» или через сброс в Настройках.
          </EmptyState>
        </div>
      ) : filtered.length === 0 && view !== 'list' ? (
        <div className="card">
          <EmptyState icon={<SearchX className="h-6 w-6" />} title="Ничего не найдено" action={<Button variant="secondary" onClick={() => setFilter({ ...EMPTY_FILTER })}>Сбросить фильтры</Button>}>
            Попробуйте изменить запрос или фильтры.
          </EmptyState>
        </div>
      ) : view === 'list' ? (
        groups.length === 0 ? (
          <div className="card">
            <EmptyState icon={<SearchX className="h-6 w-6" />} title="Ничего не найдено" action={<Button variant="secondary" onClick={() => setFilter({ ...EMPTY_FILTER })}>Сбросить фильтры</Button>}>
              Под выбранные фильтры не подходит ни одна задача.
            </EmptyState>
          </div>
        ) : (
          <StageListView groups={groups} collapsed={collapsed} onToggleCollapse={toggleCollapse} flashUid={flashUid} filtersActive={active} />
        )
      ) : view === 'calendar' ? (
        <CalendarView tasks={filtered} initialMonth={calendarStart} />
      ) : (
        <GanttView groups={groups.filter((g) => g.tasks.length > 0)} />
      )}
    </div>
  );
}
