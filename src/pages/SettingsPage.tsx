import { CalendarDays, Clock, Database, Download, FileJson, FileSpreadsheet, History, RotateCcw, ShieldAlert, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useApp } from '@/context/AppContext';
import { formatDateTime, formatDMY, formatLong, isValidTimeZone, timeInTimeZone, todayInTimeZone } from '@/domain/dates';
import { tasksToCsv } from '@/domain/csv';
import { parseImport, previewImport, SCHEMA_VERSION, type AppSnapshot, type ImportPreview } from '@/domain/importExport';
import { DEFAULT_SETTINGS, TASK_FIELD_LABELS } from '@/domain/types';
import type { ISODate, Settings } from '@/domain/types';
import { downloadFile, stamp } from '@/hooks/download';
import { hasSupabaseKey, hasSupabaseUrl, maskedKey } from '@/lib/supabaseConfig';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Checkbox';
import { DateField, SelectField } from '@/components/ui/Fields';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/Misc';

const FALLBACK_ZONES = [
  'Europe/Athens',
  'Europe/Moscow',
  'Europe/Kyiv',
  'Europe/Minsk',
  'Europe/Istanbul',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Amsterdam',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/London',
  'Asia/Tbilisi',
  'Asia/Yerevan',
  'Asia/Dubai',
  'UTC',
];

function timeZones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  const list = intl.supportedValuesOf?.('timeZone') ?? FALLBACK_ZONES;
  const set = new Set([...FALLBACK_ZONES, ...list]);
  return [...set].sort((a, b) => (a === 'Europe/Athens' ? -1 : b === 'Europe/Athens' ? 1 : a.localeCompare(b)));
}

function SettingsCard({ title, icon, children, description }: { title: string; icon: ReactNode; description?: string; children: ReactNode }) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500">{icon}</span>
        <div>
          <h2 className="text-[16px] font-bold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Row({ label, hint, children, htmlFor }: { label: string; hint?: ReactNode; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="grid gap-2 border-t border-line/70 py-4 first:border-0 first:pt-0 sm:grid-cols-[minmax(0,1fr)_240px] sm:items-center sm:gap-5">
      <div>
        <label htmlFor={htmlFor} className="text-[14px] font-semibold text-ink">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const { settings, updateSettings, now, today, repo, tasks, allTasks, stages, events, links, openHistory, confirm } = useApp();
  const [name, setName] = useState(settings.userName);
  const [initials, setInitials] = useState(settings.avatarInitials);
  const [meta, setMeta] = useState<{ seededAt?: string; importedAt?: string }>({});
  const [importState, setImportState] = useState<{ snapshot: AppSnapshot; preview: ImportPreview; fileName: string } | null>(null);
  const [resetStep, setResetStep] = useState<0 | 2>(0);
  const [resetText, setResetText] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const zones = useMemo(timeZones, []);

  useEffect(() => setName(settings.userName), [settings.userName]);
  useEffect(() => setInitials(settings.avatarInitials), [settings.avatarInitials]);
  useEffect(() => {
    void Promise.all([repo.getMeta('seededAt'), repo.getMeta('importedAt')]).then(([seededAt, importedAt]) =>
      setMeta({ seededAt: seededAt as string | undefined, importedAt: importedAt as string | undefined }),
    );
  }, [repo, events.length]);

  const setDate = (key: 'deadline' | 'submitTarget' | 'planStart', v: ISODate | '') => {
    if (!v) return;
    const next = { ...settings, [key]: v };
    if (next.planStart >= next.deadline) return toast.error('Начало плана должно быть раньше контрольного дедлайна');
    if (next.submitTarget > next.deadline) toast.warning('Целевая дата отправки позже общего дедлайна', { description: 'Сохранено, но проверьте даты.' });
    void updateSettings({ [key]: v } as Partial<Settings>);
  };

  const exportJson = async () => {
    const file = await repo.exportAll();
    downloadFile(`masha-ba-2027_${stamp()}.json`, JSON.stringify(file, null, 2), 'application/json');
    toast.success('Экспорт JSON готов', { description: `${file.data.tasks.length} задач, ${file.data.events.length} событий` });
  };

  const exportCsv = () => {
    downloadFile(`masha-ba-2027_tasks_${stamp()}.csv`, tasksToCsv(tasks, stages, today), 'text/csv;charset=utf-8');
    toast.success('CSV выгружен', { description: `${tasks.length} задач, UTF-8 с BOM, разделитель «;»` });
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    const res = parseImport(text);
    if (fileRef.current) fileRef.current.value = '';
    if (!res.ok) {
      toast.error('Файл не прошёл проверку схемы', { description: res.errors.slice(0, 4).join(' · '), duration: 9000 });
      return;
    }
    const current = await repo.snapshot();
    setImportState({ snapshot: res.snapshot, preview: previewImport(current, res.snapshot), fileName: file.name });
  };

  const applyImport = async () => {
    if (!importState) return;
    try {
      await repo.replaceAll(importState.snapshot);
      toast.success('Данные импортированы', { description: importState.fileName });
      setImportState(null);
    } catch (e) {
      toast.error('Импорт не выполнен — данные не изменены', { description: String(e) });
    }
  };

  const doReset = async () => {
    try {
      await repo.resetAll();
      setResetStep(0);
      setResetText('');
      toast.success('Данные сброшены к исходному Excel', { description: '49 задач, исходные статусы' });
    } catch (e) {
      toast.error('Сброс не выполнен', { description: String(e) });
    }
  };

  const deleted = allTasks.length - tasks.length;

  return (
    <div>
      <PageHeader title="Настройки" subtitle="Ключевые даты, время, данные. Всё хранится локально в этом браузере (IndexedDB)." />
      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsCard title="Ключевые даты" icon={<CalendarDays className="h-5 w-5" />} description="Меняют шкалы, отсчёт дней и линии на графиках сразу после сохранения.">
          <Row label="Контрольный (общий) дедлайн" hint="Общий ориентир подачи — не дедлайн каждого вуза." htmlFor="set-deadline">
            <DateField id="set-deadline" value={settings.deadline} onChange={(v) => setDate('deadline', v)} />
          </Row>
          <Row label="Целевая дата отправки заявок" hint="Свои заявки отправляем с запасом в неделю." htmlFor="set-target">
            <DateField id="set-target" value={settings.submitTarget} onChange={(v) => setDate('submitTarget', v)} />
          </Row>
          <Row label="Начало плана" hint="Левая граница шкалы «Сегодня → дедлайн»." htmlFor="set-start">
            <DateField id="set-start" value={settings.planStart} onChange={(v) => setDate('planStart', v)} />
          </Row>
          <div className="flex justify-end pt-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={
                settings.deadline === DEFAULT_SETTINGS.deadline &&
                settings.submitTarget === DEFAULT_SETTINGS.submitTarget &&
                settings.planStart === DEFAULT_SETTINGS.planStart
              }
              onClick={() =>
                void updateSettings({ deadline: DEFAULT_SETTINGS.deadline, submitTarget: DEFAULT_SETTINGS.submitTarget, planStart: DEFAULT_SETTINGS.planStart })
              }
            >
              Вернуть даты из плана (15.01 / 08.01 / 08.10)
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard title="Время и профиль" icon={<Clock className="h-5 w-5" />} description="Смена дня считается по выбранной таймзоне.">
          <Row
            label="Часовой пояс"
            htmlFor="set-tz"
            hint={
              <>
                Сейчас {timeInTimeZone(now, settings.timezone)}, {formatLong(todayInTimeZone(now, settings.timezone))}
              </>
            }
          >
            <SelectField
              id="set-tz"
              value={settings.timezone}
              onChange={(e) => isValidTimeZone(e.target.value) && void updateSettings({ timezone: e.target.value })}
            >
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                  {z === 'Europe/Athens' ? ' (по умолчанию)' : ''}
                </option>
              ))}
            </SelectField>
          </Row>
          <Row label="Имя" hint="Используется в приветствии на главной." htmlFor="set-name">
            <input
              id="set-name"
              className="field"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && name.trim() !== settings.userName && void updateSettings({ userName: name.trim() })}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          </Row>
          <Row label="Инициалы аватара" htmlFor="set-initials">
            <input
              id="set-initials"
              className="field uppercase"
              value={initials}
              maxLength={3}
              onChange={(e) => setInitials(e.target.value)}
              onBlur={() => initials.trim() && initials.trim() !== settings.avatarInitials && void updateSettings({ avatarInitials: initials.trim().toUpperCase() })}
            />
          </Row>
          <Row label="Тема" hint="Интерфейс спроектирован в светлой теме.">
            <div className="flex h-10 items-center rounded-xl border border-line bg-[#FAFBFC] px-3.5 text-[14px] text-ink-soft">Светлая</div>
          </Row>
          <Row label="Празднование выполнения" hint="Конфетти и поздравление при завершении задачи (учитывает «уменьшение движения»)." htmlFor="set-celebrate">
            <Switch id="set-celebrate" checked={settings.celebrate} onChange={(v) => void updateSettings({ celebrate: v })} label="Празднование выполнения" />
          </Row>
        </SettingsCard>

        <SettingsCard title="Данные" icon={<Database className="h-5 w-5" />} description="Автосохранение каждого изменения в IndexedDB. Экспорт — резервная копия.">
          <div className="flex flex-wrap gap-2.5">
            <Button variant="outline" onClick={() => void exportJson()}>
              <FileJson className="h-4 w-4" /> Экспорт JSON
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Импорт JSON
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <FileSpreadsheet className="h-4 w-4" /> Задачи в CSV
            </Button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} aria-label="Файл для импорта" />
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 rounded-2xl bg-[#F7F8FB] p-4 text-[13px] sm:grid-cols-3">
            <Info label="Версия схемы" value={`v${SCHEMA_VERSION}`} />
            <Info label="Задач" value={`${tasks.length}${deleted ? ` (+${deleted} удал.)` : ''}`} />
            <Info label="Событий в журнале" value={String(events.length)} />
            <Info label="Ссылок" value={String(links.length)} />
            <Info label="База создана" value={meta.seededAt ? formatDateTime(meta.seededAt, settings.timezone) : '—'} />
            <Info label="Последний импорт" value={meta.importedAt ? formatDateTime(meta.importedAt, settings.timezone) : '—'} />
          </dl>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-line px-4 py-3 text-[12.5px] text-ink-muted">
            <span className="font-semibold text-ink">Supabase</span>
            <span>ключ: {hasSupabaseKey ? <code className="text-ink-soft">{maskedKey()}</code> : 'не задан'}</span>
            <span>· URL проекта: {hasSupabaseUrl ? 'задан' : 'не задан (VITE_SUPABASE_URL в .env)'}</span>
            <span className="basis-full text-ink-faint">Данные приложения по-прежнему хранятся локально; Supabase пока не используется для синхронизации.</span>
          </div>
          <Button variant="ghost" className="mt-3" onClick={() => openHistory()}>
            <History className="h-4 w-4" /> Открыть историю изменений
          </Button>
        </SettingsCard>

        <SettingsCard title="Сброс" icon={<ShieldAlert className="h-5 w-5" />} description="Вернуть все данные к исходному Excel: 49 задач с исходными статусами.">
          <p className="text-[13.5px] leading-relaxed text-ink-muted">
            Будут удалены все изменения статусов, новые задачи, журнал событий, ссылки и настройки. Перед сбросом рекомендуем сделать
            экспорт JSON. Нужно подтвердить дважды.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => void exportJson()}>
              <Download className="h-4 w-4" /> Сначала экспорт
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                confirm({
                  title: 'Сбросить все данные?',
                  description: 'Шаг 1 из 2. Все локальные изменения будут удалены без возможности отмены.',
                  confirmLabel: 'Продолжить',
                  tone: 'danger',
                  onConfirm: () => setResetStep(2),
                })
              }
            >
              <RotateCcw className="h-4 w-4" /> Сбросить к исходным данным
            </Button>
          </div>
        </SettingsCard>
      </div>

      <Modal
        open={resetStep === 2}
        onOpenChange={(o) => {
          if (!o) {
            setResetStep(0);
            setResetText('');
          }
        }}
        title="Подтвердите сброс"
        description="Шаг 2 из 2. Введите слово СБРОС, чтобы удалить все изменения и вернуть исходный Excel."
        className="max-w-[440px]"
        footer={
          <>
            <Button variant="secondary" size="lg" onClick={() => (setResetStep(0), setResetText(''))}>
              Отмена
            </Button>
            <Button variant="danger" size="lg" disabled={resetText.trim().toUpperCase() !== 'СБРОС'} onClick={() => void doReset()}>
              Сбросить окончательно
            </Button>
          </>
        }
      >
        <input className="field" value={resetText} onChange={(e) => setResetText(e.target.value)} placeholder="СБРОС" aria-label="Слово подтверждения" autoFocus />
      </Modal>

      <Modal
        open={Boolean(importState)}
        onOpenChange={(o) => !o && setImportState(null)}
        title="Предпросмотр импорта"
        description={importState ? `Файл «${importState.fileName}» прошёл проверку схемы. Текущие данные будут заменены.` : undefined}
        className="max-w-[600px]"
        footer={
          <>
            <Button variant="secondary" size="lg" onClick={() => setImportState(null)}>
              Отмена
            </Button>
            <Button size="lg" onClick={() => void applyImport()}>
              Применить импорт
            </Button>
          </>
        }
      >
        {importState && <ImportSummary preview={importState.preview} snapshot={importState.snapshot} />}
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11.5px] text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
    </div>
  );
}

function ImportSummary({ preview, snapshot }: { preview: ImportPreview; snapshot: AppSnapshot }) {
  const stats = [
    { label: 'Задач в файле', value: snapshot.tasks.filter((t) => !t.deletedAt).length },
    { label: 'Новых', value: preview.added.length },
    { label: 'Изменённых', value: preview.changed.length },
    { label: 'Будет удалено', value: preview.removed.length },
    { label: 'Смен статуса', value: preview.statusChanges },
    { label: 'Событий журнала', value: preview.eventsCount },
  ];
  return (
    <div className="space-y-4 pb-2">
      <div className="grid grid-cols-3 gap-2.5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-[#F7F8FB] px-3 py-2.5">
            <p className="text-[11.5px] text-ink-muted">{s.label}</p>
            <p className="text-[18px] font-bold text-ink">{s.value}</p>
          </div>
        ))}
      </div>
      {preview.changed.length > 0 && (
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink">Изменения</p>
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line p-3 text-[12.5px] text-ink-soft scrollbar-thin">
            {preview.changed.slice(0, 40).map((c) => (
              <li key={c.after.id}>
                <b>{c.after.id}</b> {c.fields.map((f) => `${TASK_FIELD_LABELS[f] ?? f}: ${String(c.before[f])} → ${String(c.after[f])}`).join('; ')}
              </li>
            ))}
          </ul>
        </div>
      )}
      {preview.added.length > 0 && (
        <p className="text-[12.5px] text-ink-muted">
          Новые: {preview.added.slice(0, 8).map((t) => t.id).join(', ')}
          {preview.added.length > 8 && '…'}
        </p>
      )}
      {preview.removed.length > 0 && (
        <p className="text-[12.5px] text-[#C22F34]">
          Исчезнут: {preview.removed.slice(0, 8).map((t) => t.id).join(', ')}
          {preview.removed.length > 8 && '…'}
        </p>
      )}
      <p className="text-[12.5px] text-ink-muted">
        Ссылок: {preview.linksCount}. Настройки: {preview.settingsChanged.length ? preview.settingsChanged.join(', ') : 'без изменений'}. Контрольный дедлайн в файле:{' '}
        {formatDMY(snapshot.settings.deadline)}.
      </p>
    </div>
  );
}
