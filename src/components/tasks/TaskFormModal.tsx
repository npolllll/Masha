import { ChevronDown, Layers, Trash2 } from 'lucide-react';
import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { useApp } from '@/context/AppContext';
import { allAssignees } from '@/domain/filters';
import { validateTaskInput, type TaskErrors } from '@/domain/validation';
import { DEADLINE_TYPES, MAIN_STATUSES } from '@/domain/types';
import type { DeadlineType, ISODate, TaskStatus } from '@/domain/types';
import { Button } from '@/components/ui/Button';
import { DateField, FieldError, Segmented, SelectField } from '@/components/ui/Fields';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/components/ui/cn';

interface FormState {
  title: string;
  stageId: number | '';
  startDate: ISODate | '';
  dueDate: ISODate | '';
  description: string;
  assignee: string;
  deadlineType: DeadlineType;
  status: TaskStatus;
  result: string;
  conditional: boolean;
}

const EMPTY: FormState = {
  title: '',
  stageId: '',
  startDate: '',
  dueDate: '',
  description: '',
  assignee: 'Маша',
  deadlineType: 'Плановый',
  status: 'Не начато',
  result: '',
  conditional: false,
};

export function TaskFormModal() {
  const { taskForm, closeForm, createTask, updateTask, stages, tasks, today, requestDelete } = useApp();
  const open = Boolean(taskForm);
  const editing = taskForm?.mode === 'edit' ? taskForm.task : null;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<TaskErrors>({});
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const ids = { title: useId(), stage: useId(), start: useId(), due: useId(), desc: useId(), owner: useId(), result: useId(), owners: useId() };
  const owners = useMemo(() => allAssignees(tasks).filter((a) => a !== '—'), [tasks]);

  useEffect(() => {
    if (!taskForm) return;
    setErrors({});
    setSaving(false);
    if (taskForm.mode === 'edit') {
      const t = taskForm.task;
      setForm({
        title: t.title,
        stageId: t.stageId,
        startDate: t.startDate,
        dueDate: t.dueDate,
        description: t.description,
        assignee: t.assignee,
        deadlineType: t.deadlineType,
        status: t.status,
        result: t.result,
        conditional: t.conditional,
      });
      setAdvanced(true);
    } else {
      const p = taskForm.prefill ?? {};
      setForm({ ...EMPTY, ...p, stageId: p.stageId ?? '', startDate: p.startDate ?? '', dueDate: p.dueDate ?? '' } as FormState);
      setAdvanced(false);
    }
  }, [taskForm]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as keyof TaskErrors]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    // Дата начала необязательна: по умолчанию сегодня (или сам дедлайн, если он уже в прошлом).
    const startDate = form.startDate || (editing ? editing.startDate : form.dueDate && form.dueDate < today ? form.dueDate : today);
    const candidate = {
      title: form.title,
      stageId: form.stageId === '' ? undefined : form.stageId,
      startDate,
      dueDate: form.dueDate || undefined,
      deadlineType: form.deadlineType,
      status: form.status,
    };
    const errs = validateTaskInput(candidate);
    setErrors(errs);
    if (Object.keys(errs).length) {
      if (errs.startDate || errs.status) setAdvanced(true);
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      first?.focus();
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      stageId: form.stageId as number,
      startDate,
      dueDate: form.dueDate as ISODate,
      description: form.description,
      assignee: form.assignee,
      deadlineType: form.deadlineType,
      status: form.status,
      result: form.result,
      conditional: form.conditional,
    };
    const ok = editing ? await updateTask(editing, payload) : await createTask(payload);
    setSaving(false);
    if (ok) closeForm();
  };

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && closeForm()}
      title={editing ? `Редактировать задачу ${editing.id}` : 'Добавить задачу'}
      description={editing ? (editing.source === 'excel' ? 'Исходная задача из Excel — её ID не меняется.' : undefined) : undefined}
      initialFocusSelector="textarea"
      className="max-w-[560px]"
    >
      <form id="task-form" onSubmit={onSubmit} noValidate className="space-y-4 pb-2">
        <div>
          <label htmlFor={ids.title} className="label">
            Название задачи
          </label>
          <textarea
            id={ids.title}
            rows={2}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Например: Подготовить мотивационное письмо для программы X"
            aria-invalid={Boolean(errors.title) || undefined}
            aria-describedby={errors.title ? `${ids.title}-err` : undefined}
            className="field resize-none leading-relaxed"
            maxLength={300}
          />
          <FieldError id={`${ids.title}-err`}>{errors.title}</FieldError>
        </div>

        <div>
          <label htmlFor={ids.stage} className="label">
            Этап
          </label>
          <SelectField
            id={ids.stage}
            icon={<Layers className="h-4 w-4" />}
            value={form.stageId === '' ? '' : String(form.stageId)}
            onChange={(e) => set('stageId', e.target.value === '' ? '' : Number(e.target.value))}
            aria-invalid={Boolean(errors.stageId) || undefined}
            aria-describedby={errors.stageId ? `${ids.stage}-err` : undefined}
            className={form.stageId === '' ? 'text-ink-faint' : ''}
          >
            <option value="">Выберите этап</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id} className="text-ink">
                Этап {s.id}. {s.title}
              </option>
            ))}
          </SelectField>
          <FieldError id={`${ids.stage}-err`}>{errors.stageId}</FieldError>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={ids.start} className="label">
              Дата начала <span className="font-normal text-ink-muted">(по умолч. сегодня)</span>
            </label>
            <DateField
              id={ids.start}
              value={form.startDate}
              onChange={(v) => set('startDate', v)}
              clearable
              invalid={Boolean(errors.startDate)}
              describedBy={errors.startDate ? `${ids.start}-err` : undefined}
            />
            <FieldError id={`${ids.start}-err`}>{errors.startDate}</FieldError>
          </div>
          <div>
            <label htmlFor={ids.due} className="label">
              Дата окончания (дедлайн)
            </label>
            <DateField
              id={ids.due}
              value={form.dueDate}
              onChange={(v) => set('dueDate', v)}
              invalid={Boolean(errors.dueDate)}
              describedBy={errors.dueDate ? `${ids.due}-err` : undefined}
            />
            <FieldError id={`${ids.due}-err`}>{errors.dueDate}</FieldError>
          </div>
        </div>

        <div>
          <label htmlFor={ids.desc} className="label">
            Описание <span className="font-normal text-ink-muted">(необязательно)</span>
          </label>
          <textarea
            id={ids.desc}
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Дополнительная информация..."
            className="field resize-y leading-relaxed"
          />
        </div>

        <div className="rounded-2xl border border-line">
          <button
            type="button"
            aria-expanded={advanced}
            onClick={() => setAdvanced((v) => !v)}
            className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-[14px] font-semibold text-ink hover:bg-[#FAFBFC]"
          >
            Дополнительно
            <span className="flex items-center gap-2 text-[12.5px] font-normal text-ink-muted">
              {!advanced && `${form.assignee || 'Маша'} · ${form.deadlineType} · ${form.status}`}
              <ChevronDown className={cn('h-4 w-4 transition', advanced && 'rotate-180')} />
            </span>
          </button>
          {advanced && (
            <div className="space-y-4 border-t border-line px-4 pb-4 pt-4">
              <div>
                <label htmlFor={ids.owner} className="label">
                  Владелец
                </label>
                <input
                  id={ids.owner}
                  list={ids.owners}
                  value={form.assignee}
                  onChange={(e) => set('assignee', e.target.value)}
                  placeholder="Маша"
                  className="field"
                />
                <datalist id={ids.owners}>
                  {owners.map((o) => (
                    <option key={o} value={o} />
                  ))}
                  <option value="Маша, Никита" />
                </datalist>
              </div>
              <div>
                <span className="label">Тип срока</span>
                <Segmented
                  label="Тип срока"
                  value={form.deadlineType}
                  onChange={(v) => set('deadlineType', v)}
                  options={DEADLINE_TYPES.map((t) => ({ value: t, label: t }))}
                  className="w-full"
                />
              </div>
              <div>
                <span className="label">Статус</span>
                <Segmented
                  label="Статус"
                  value={form.status}
                  onChange={(v) => set('status', v)}
                  options={[
                    ...MAIN_STATUSES.map((s) => ({ value: s, label: s })),
                    ...(form.status === 'Не требуется' ? [{ value: 'Не требуется' as TaskStatus, label: 'Не требуется' }] : []),
                  ]}
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor={ids.result} className="label">
                  Ожидаемый результат
                </label>
                <input
                  id={ids.result}
                  value={form.result}
                  onChange={(e) => set('result', e.target.value)}
                  placeholder="Например: PDF в общей папке"
                  className="field"
                />
              </div>
              <label className="flex cursor-pointer items-start gap-3 text-[13.5px] text-ink-soft">
                <input
                  type="checkbox"
                  checked={form.conditional}
                  onChange={(e) => set('conditional', e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-rose-500"
                />
                <span>
                  Условная задача <span className="text-ink-muted">(«если…» — может оказаться «Не требуется»)</span>
                </span>
              </label>
            </div>
          )}
        </div>
      </form>
      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center justify-end gap-3 bg-white px-1 pb-6 pt-4">
        {editing && (
          <Button variant="ghost" className="mr-auto text-[#D93A3F] hover:bg-[#FDECEC] hover:text-[#C22F34]" onClick={() => requestDelete(editing)}>
            <Trash2 className="h-4 w-4" />
            Удалить
          </Button>
        )}
        <Button variant="secondary" size="lg" className="min-w-[130px]" onClick={closeForm}>
          Отмена
        </Button>
        <Button type="submit" form="task-form" size="lg" className="min-w-[180px]" disabled={saving}>
          {editing ? 'Сохранить' : 'Добавить задачу'}
        </Button>
      </div>
    </Modal>
  );
}
