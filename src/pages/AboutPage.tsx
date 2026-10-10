import { AlertTriangle, CheckCircle2, ExternalLink, Heart, Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import {
  DOCUMENT_SECTION,
  DOCX_STAGE_NOTES,
  GUIDELINES_INTRO,
  HOUSING_SECTION,
  MILESTONES,
  PLAN_INTRO,
  PLAN_TITLE,
  PLAN_TZ_NOTE,
  REQUIREMENTS,
  VISA_SECTION,
} from '@/data/plan';
import { EUROPE_GUIDELINES } from '@/storage/seed';
import { formatDMY, formatLong } from '@/domain/dates';
import { compareTaskIds } from '@/domain/ids';
import type { LinkItem, Task } from '@/domain/types';
import { Accordion, Callout, TaskLine } from '@/components/about/AboutParts';
import { StreetScene } from '@/components/illustrations/Scenes';
import { StageStatusBadge } from '@/components/ui/Badges';
import { Button } from '@/components/ui/Button';
import { EmptyState, PageHeader } from '@/components/ui/Misc';
import { ProgressBar } from '@/components/ui/Progress';
import { cn } from '@/components/ui/cn';

const TABS = [
  { id: 'plan', label: 'Общий план' },
  { id: 'stages', label: 'Этапы' },
  { id: 'requirements', label: 'Требования вузов' },
  { id: 'documents', label: 'Документы' },
  { id: 'visa', label: 'Визы' },
  { id: 'housing', label: 'Жильё' },
  { id: 'links', label: 'Полезные ссылки' },
] as const;
type TabId = (typeof TABS)[number]['id'];

export function AboutPage() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab') as TabId | null;
  const tab: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : 'plan';
  const setTab = (id: TabId) => setParams(id === 'plan' ? {} : { tab: id }, { replace: true });

  return (
    <div>
      <PageHeader title="Описание и материалы" subtitle="Вся информация о проекте, этапах, требованиях и документах." />
      <div className="-mx-4 mb-6 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Разделы" className="inline-flex min-w-max gap-1 rounded-2xl bg-[#EFF1F5] p-1.5">
          {TABS.map((t) => {
            const selected = t.id === tab;
            return (
              <button
                key={t.id}
                id={`tab-${t.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={cn(
                  'relative h-10 whitespace-nowrap rounded-xl px-4 text-[13.5px] font-medium transition',
                  selected ? 'bg-white text-rose-600 shadow-[0_1px_3px_rgba(24,32,51,0.08)]' : 'text-ink-soft hover:bg-white/60 hover:text-ink',
                )}
              >
                {t.label}
                {selected && <span className="absolute inset-x-3 -bottom-1.5 h-[3px] rounded-full bg-rose-500" />}
              </button>
            );
          })}
        </div>
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'plan' && <PlanTab />}
        {tab === 'stages' && <StagesTab />}
        {tab === 'requirements' && <RequirementsTab />}
        {tab === 'documents' && <DocumentsTab />}
        {tab === 'visa' && <VisaTab />}
        {tab === 'housing' && <HousingTab />}
        {tab === 'links' && <LinksTab />}
      </div>
    </div>
  );
}

function useTaskById() {
  const { tasks } = useApp();
  return useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
}

function PlanTab() {
  const { today, settings, tasks } = useApp();
  const byId = useTaskById();
  const todayIndex = MILESTONES.findIndex((m) => (m.endDate ?? m.date) >= today);
  const afterDeadline = useMemo(
    () => tasks.filter((t) => t.stageId === 4 && t.dueDate > settings.deadline).sort((a, b) => compareTaskIds(a.id, b.id)),
    [tasks, settings.deadline],
  );
  const orientirs = tasks.filter((t) => t.deadlineType === 'Ориентир');

  const todayRow = (
    <li key="today" className="relative flex items-center gap-4 py-1.5" aria-label={`Сегодня ${formatLong(today)}`}>
      <span className="absolute left-[5px] top-1/2 h-[2px] w-[calc(100%-5px)] -translate-y-1/2 bg-gradient-to-r from-rose-300 to-transparent" aria-hidden />
      <span className="relative z-10 h-3.5 w-3.5 rounded-full border-[3px] border-white bg-rose-500 shadow" />
      <span className="relative z-10 rounded-md bg-rose-500 px-2 py-0.5 text-[12px] font-semibold text-white">Сегодня · {formatDMY(today)}</span>
    </li>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="card p-5 sm:p-7" aria-labelledby="main-title">
          <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-faint">{PLAN_TITLE}</p>
          <h2 id="main-title" className="mt-2 text-[18px] font-bold text-ink">
            Главное
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
            Общий дедлайн подачи в вузы Западной Европы: <b className="text-ink">15.01.2027</b>.<br />
            Свои заявки отправляем до <b className="text-ink">08.01</b>, с запасом в неделю.
          </p>

          <ol className="relative mt-5 space-y-0.5">
            <span aria-hidden className="absolute bottom-3 left-[11px] top-3 w-[2px] bg-rose-100" />
            {MILESTONES.map((m, i) => {
              const task = m.taskId ? byId.get(m.taskId) : undefined;
              const done = task?.status === 'Готово';
              const past = (m.endDate ?? m.date) < today;
              const rows = [];
              if (i === todayIndex) rows.push(todayRow);
              rows.push(
                <li key={m.label} className="relative grid grid-cols-[24px_minmax(110px,170px)_1fr] items-start gap-x-3 py-1.5 sm:grid-cols-[24px_200px_1fr]">
                  <span className="relative z-10 mt-1.5 grid place-items-center">
                    <span
                      className={cn(
                        'h-2.5 w-2.5 rounded-full ring-4 ring-white',
                        done ? 'bg-mint-500' : m.kind === 'deadline' ? 'bg-[#E5484D]' : m.kind === 'priority' ? 'bg-amber-500' : 'bg-rose-500',
                      )}
                    />
                  </span>
                  <span className={cn('text-[14px] font-semibold', past && !done ? 'text-ink-muted' : 'text-ink')}>{m.label}</span>
                  <span className="flex flex-wrap items-center gap-2 text-[14px] text-ink-muted">
                    {m.text}
                    {m.kind === 'priority' && <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-600">приоритет</span>}
                    {m.kind === 'deadline' && <span className="rounded-md bg-[#FDECEC] px-1.5 py-0.5 text-[11px] font-semibold text-[#D93A3F]">общий ориентир</span>}
                    {m.kind === 'guideline' && <span className="rounded-md bg-lilac-50 px-1.5 py-0.5 text-[11px] font-semibold text-lilac-500">ориентир</span>}
                    {done && (
                      <span className="inline-flex items-center gap-1 text-[12px] font-medium text-mint-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> готово
                      </span>
                    )}
                    {task && <span className="text-[11.5px] text-ink-faint">задача {task.id}</span>}
                  </span>
                </li>,
              );
              return rows;
            })}
            {todayIndex === -1 && todayRow}
          </ol>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Callout tone="warn" title="08.01 важнее 15.01">
              Свои заявки отправляем до 08.01.2027 — с запасом в неделю до общего ориентира. В трекере это жёсткая задача 4.3.
            </Callout>
            <Callout tone="info" title="15.01 — общий ориентир">
              15.01.2027 — плановый общий ориентир для сильных программ Западной Европы, а не подтверждённый дедлайн каждого
              университета. Сроки каждой программы проверяются отдельно.
            </Callout>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <div className="overflow-hidden rounded-[22px] shadow-card">
            <StreetScene className="block aspect-[240/380] max-h-[520px] w-full" />
          </div>
          <div className="grid place-items-center rounded-[22px] bg-gradient-to-br from-[#FBEFF3] to-[#F5E3EC] px-6 py-8 text-center">
            <p className="font-hand text-[34px] leading-[1.05] text-ink-soft">
              Big dreams
              <br />
              real steps <Heart className="inline h-6 w-6 -translate-y-0.5 text-rose-400" />
            </p>
          </div>
        </aside>
      </div>

      <Accordion title="Ориентиры по Западной Европе" subtitle={`${GUIDELINES_INTRO} — вкладка Excel «Ориентиры по Европе» и таблица DOCX`} defaultOpen>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left text-[13.5px]">
            <thead>
              <tr className="text-[12px] uppercase tracking-wide text-ink-faint">
                <th className="border-b border-line pb-2.5 pr-4 font-semibold">Что</th>
                <th className="border-b border-line pb-2.5 pr-4 font-semibold">Когда</th>
                <th className="border-b border-line pb-2.5 font-semibold">Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {EUROPE_GUIDELINES.map((g) => (
                <tr key={g.topic} className="align-top">
                  <td className="border-b border-line/70 py-3 pr-4 font-semibold text-ink">{g.topic}</td>
                  <td className="whitespace-nowrap border-b border-line/70 py-3 pr-4 text-rose-600">{g.period}</td>
                  <td className="border-b border-line/70 py-3 leading-relaxed text-ink-soft">{g.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Accordion>

      <Accordion
        title="Расхождения дат и ориентиры"
        subtitle="Не исправлены автоматически — помечены как ориентиры"
        aside={<AlertTriangle className="h-5 w-5 text-amber-500" />}
      >
        <div className="space-y-4 text-[13.5px] leading-relaxed text-ink-soft">
          <p>
            Условие закрытия этапа 4 — «все заявки поданы до общего дедлайна 15.01», но в этап входят задачи со сроками позже
            15.01: финиш этапа по Excel и DOCX — 31.03.2027. Это запасная волна и отбор, а не перенос общего дедлайна.
          </p>
          {afterDeadline.length > 0 && (
            <ul className="divide-y divide-line rounded-2xl border border-line px-4">
              {afterDeadline.map((t) => (
                <TaskLine key={t.uid} task={t} />
              ))}
            </ul>
          )}
          <p>
            Задачи с типом срока «Ориентир» ({orientirs.length}) — ориентировочные даты (решения вузов, рассмотрение визы,
            начало учёбы и т.п.). Они показываются на шкалах, но не считаются подтверждёнными дедлайнами.
          </p>
          <p className="text-ink-muted">{PLAN_INTRO}</p>
        </div>
      </Accordion>

      <Callout tone="pink" title="Важно для ТЗ">
        {PLAN_TZ_NOTE}
      </Callout>
    </div>
  );
}

function StagesTab() {
  const { stageStats, confirmStage } = useApp();
  return (
    <div className="space-y-3">
      {stageStats.map((s, i) => (
        <Accordion
          key={s.stage.id}
          defaultOpen={i === 0}
          title={
            <span className="flex items-center gap-3">
              <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-[14px] font-bold', s.status === 'Закрыт' ? 'bg-mint-100 text-mint-600' : 'bg-rose-100 text-rose-500')}>
                {s.stage.id}
              </span>
              Этап {s.stage.id}. {s.stage.title}
            </span>
          }
          subtitle={
            <span className="ml-11 block">
              {s.startDate && s.endDate ? `${formatDMY(s.startDate)} → ${formatDMY(s.endDate)}` : 'нет задач'} · {s.done}/{s.applicable} готово
            </span>
          }
          aside={
            <span className="hidden items-center gap-3 sm:flex">
              <ProgressBar value={s.ratio} tone={s.pct === 100 ? 'green' : 'pink'} className="w-32" label={`Этап ${s.stage.id}`} />
              <span className="w-10 text-right text-[13px] font-bold">{s.pct}%</span>
              <StageStatusBadge status={s.status} />
            </span>
          }
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-[#F7F8FB] px-4 py-3.5">
              <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={s.stage.criterionConfirmed}
                  onChange={(e) => void confirmStage(s.stage.id, e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-mint-500"
                />
                <span>
                  <b className="text-ink">Этап закрыт, когда:</b> {s.stage.completionCriterion}.
                  <span className="mt-0.5 block text-[12px] text-ink-muted">
                    «Закрыт» = все применимые задачи «Готово» + ручное подтверждение условия.
                  </span>
                </span>
              </label>
              <span className="text-[12px] text-ink-muted">DOCX: {DOCX_STAGE_NOTES[s.stage.id]?.period}</span>
            </div>
            {DOCX_STAGE_NOTES[s.stage.id]?.note && <p className="text-[12.5px] text-ink-muted">{DOCX_STAGE_NOTES[s.stage.id]?.note}</p>}
            <ul className="divide-y divide-line">
              {s.tasks.map((t) => (
                <TaskLine key={t.uid} task={t} />
              ))}
            </ul>
          </div>
        </Accordion>
      ))}
    </div>
  );
}

function RequirementsTab() {
  const byId = useTaskById();
  const related = ['1.1', '1.5', '2.4', '0.5', '4.5'].map((id) => byId.get(id)).filter(Boolean) as Task[];
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="card p-5 sm:p-7">
        <h2 className="text-[17px] font-bold text-ink">Критерии подбора программ (ТЗ агентству)</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {REQUIREMENTS.tz.map((r) => (
            <div key={r.title} className="rounded-2xl border border-line p-4">
              <p className="text-[15px] font-bold text-rose-600">{r.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{r.text}</p>
            </div>
          ))}
        </div>
        <h3 className="mt-6 text-[15px] font-bold text-ink">Что важно учитывать</h3>
        <ul className="mt-3 space-y-2.5">
          {REQUIREMENTS.caveats.map((c) => (
            <li key={c} className="flex gap-3 text-[14px] leading-relaxed text-ink-soft">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
              {c}
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <Callout tone="warn" title="Не универсальные требования">
            {REQUIREMENTS.disclaimer}
          </Callout>
        </div>
      </section>
      <section className="card p-5 sm:p-6">
        <h3 className="text-[15px] font-bold text-ink">Связанные задачи</h3>
        <ul className="mt-2 divide-y divide-line">
          {related.map((t) => (
            <TaskLine key={t.uid} task={t} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function SectionWithTasks({ title, intro, guideline, tasks, extra }: { title: string; intro: string; guideline?: string; tasks: Task[]; extra?: string }) {
  const done = tasks.filter((t) => t.status === 'Готово').length;
  const applicable = tasks.filter((t) => t.status !== 'Не требуется').length;
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="card p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-bold text-ink">{title}</h2>
          <span className="text-[13px] font-semibold text-ink-muted">
            {done} / {applicable} готово
          </span>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">{intro}</p>
        <ul className="mt-3 divide-y divide-line">
          {tasks.map((t) => (
            <TaskLine key={t.uid} task={t} />
          ))}
        </ul>
        {tasks.length === 0 && <p className="py-6 text-center text-[13.5px] text-ink-muted">Задачи этого раздела удалены.</p>}
      </section>
      <aside className="space-y-4">
        {guideline && (
          <Callout tone="info" title="Ориентир (Excel «Ориентиры по Европе»)">
            {guideline}
          </Callout>
        )}
        {extra && <Callout tone="pink">{extra}</Callout>}
        <Callout tone="warn">Список — из мастер-плана. Обязательные требования конкретной страны, посольства или вуза здесь не придумываются и уточняются отдельно.</Callout>
      </aside>
    </div>
  );
}

function DocumentsTab() {
  const { tasks } = useApp();
  const byId = useTaskById();
  const list = [...tasks.filter((t) => t.stageId === 3).sort((a, b) => compareTaskIds(a.id, b.id)), ...(byId.get('0.5') ? [byId.get('0.5') as Task] : [])];
  return <SectionWithTasks title="Документы" intro={DOCUMENT_SECTION.intro} tasks={list} extra={DOCUMENT_SECTION.extra} />;
}

function VisaTab() {
  const { tasks } = useApp();
  const byId = useTaskById();
  const list = [
    ...tasks.filter((t) => t.stageId === 6).sort((a, b) => compareTaskIds(a.id, b.id)),
    ...(VISA_SECTION.related.map((id) => byId.get(id)).filter(Boolean) as Task[]),
  ];
  return <SectionWithTasks title="Студенческая виза" intro={VISA_SECTION.intro} guideline={VISA_SECTION.guideline} tasks={list} />;
}

function HousingTab() {
  const { tasks } = useApp();
  const list = tasks.filter((t) => t.stageId === 7).sort((a, b) => compareTaskIds(a.id, b.id));
  return <SectionWithTasks title="Жильё" intro={HOUSING_SECTION.intro} guideline={HOUSING_SECTION.guideline} tasks={list} />;
}

function normalizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

function LinksTab() {
  const { links, repo, confirm } = useApp();
  const [editing, setEditing] = useState<LinkItem | null>(null);
  const [form, setForm] = useState({ title: '', url: '', note: '' });
  const [error, setError] = useState<string | null>(null);

  const startEdit = (l: LinkItem) => {
    setEditing(l);
    setForm({ title: l.title, url: l.url, note: l.note });
    setError(null);
  };
  const reset = () => {
    setEditing(null);
    setForm({ title: '', url: '', note: '' });
    setError(null);
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const url = normalizeUrl(form.url);
    if (!form.title.trim()) return setError('Введите название');
    if (!url) return setError('Введите корректную ссылку (http/https)');
    try {
      if (editing) await repo.updateLink(editing.id, { title: form.title.trim(), url, note: form.note.trim() });
      else await repo.addLink({ title: form.title, url, note: form.note });
      toast.success(editing ? 'Ссылка обновлена' : 'Ссылка добавлена');
      reset();
    } catch (err) {
      toast.error('Не удалось сохранить ссылку', { description: String(err) });
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="card p-5 sm:p-6">
        <h2 className="text-[17px] font-bold text-ink">Мои закладки</h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          Порталы подачи, страницы программ, контакты агентства и Anatolia — всё, что нужно держать под рукой. Хранится только на
          этом устройстве.
        </p>
        {links.length === 0 ? (
          <EmptyState icon={<Link2 className="h-6 w-6" />} title="Пока нет ссылок">
            Добавьте первую закладку в форме справа. Списка «официальных» вузов здесь нет — только ваши ссылки.
          </EmptyState>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {links.map((l) => (
              <li key={l.id} className="flex items-start gap-3 py-3.5">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500">
                  <Link2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink hover:text-rose-600">
                    {l.title} <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <p className="truncate text-[12.5px] text-ink-muted">{l.url}</p>
                  {l.note && <p className="mt-1 text-[13px] text-ink-soft">{l.note}</p>}
                </div>
                <Button variant="ghost" size="iconSm" aria-label={`Изменить ${l.title}`} onClick={() => startEdit(l)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label={`Удалить ${l.title}`}
                  onClick={() =>
                    confirm({
                      title: 'Удалить ссылку?',
                      description: `«${l.title}» будет удалена из закладок.`,
                      tone: 'danger',
                      confirmLabel: 'Удалить',
                      onConfirm: async () => {
                        await repo.deleteLink(l.id);
                        if (editing?.id === l.id) reset();
                        toast('Ссылка удалена');
                      },
                    })
                  }
                >
                  <Trash2 className="h-4 w-4 text-[#D93A3F]" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card h-fit p-5 sm:p-6">
        <h3 className="text-[15px] font-bold text-ink">{editing ? 'Изменить ссылку' : 'Новая ссылка'}</h3>
        <form onSubmit={submit} className="mt-4 space-y-3.5" noValidate>
          <div>
            <label className="label" htmlFor="link-title">
              Название
            </label>
            <input id="link-title" className="field" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Например: портал подачи программы X" />
          </div>
          <div>
            <label className="label" htmlFor="link-url">
              Ссылка
            </label>
            <input id="link-url" className="field" inputMode="url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://…" />
          </div>
          <div>
            <label className="label" htmlFor="link-note">
              Заметка <span className="font-normal text-ink-muted">(необязательно)</span>
            </label>
            <textarea id="link-note" rows={2} className="field resize-none" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
          {error && (
            <p role="alert" className="text-[12.5px] font-medium text-[#D93A3F]">
              {error}
            </p>
          )}
          <div className="flex gap-2.5 pt-1">
            {editing && (
              <Button variant="secondary" onClick={reset}>
                Отмена
              </Button>
            )}
            <Button type="submit" className="flex-1">
              {editing ? 'Сохранить' : (
                <>
                  <Plus className="h-4 w-4" /> Добавить ссылку
                </>
              )}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
