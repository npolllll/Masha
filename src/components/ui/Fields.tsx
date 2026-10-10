import * as Popover from '@radix-ui/react-popover';
import { CalendarDays, ChevronDown, X } from 'lucide-react';
import { useId, useState, type ReactNode, type SelectHTMLAttributes } from 'react';
import { DayPicker } from 'react-day-picker';
import { ru } from 'react-day-picker/locale';
import { dateToISO, formatDMY, isoToDate } from '@/domain/dates';
import type { ISODate } from '@/domain/types';
import { cn } from './cn';

export function SelectField({
  icon,
  className,
  wrapperClassName,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { icon?: ReactNode; wrapperClassName?: string }) {
  return (
    <div className={cn('relative', wrapperClassName)}>
      {icon && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted">{icon}</span>}
      <select
        {...props}
        className={cn('field cursor-pointer appearance-none pr-10', icon ? 'pl-10' : '', className)}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden />
    </div>
  );
}

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[12.5px] font-medium text-[#D93A3F]">
      {children}
    </p>
  );
}

export function DateField({
  value,
  onChange,
  placeholder = 'Выберите дату',
  invalid,
  clearable,
  id,
  describedBy,
  ariaLabel,
  min,
  max,
}: {
  value: ISODate | '';
  onChange: (v: ISODate | '') => void;
  placeholder?: string;
  invalid?: boolean;
  clearable?: boolean;
  id?: string;
  describedBy?: string;
  ariaLabel?: string;
  min?: ISODate;
  max?: ISODate;
}) {
  const [open, setOpen] = useState(false);
  const autoId = useId();
  const selected = value ? isoToDate(value) : undefined;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="relative">
        <Popover.Trigger asChild>
          <button
            id={id ?? autoId}
            type="button"
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            aria-label={ariaLabel}
            aria-haspopup="dialog"
            className={cn('field flex items-center gap-2.5 pr-10 text-left', !value && 'text-ink-faint')}
          >
            <CalendarDays className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
            <span className="truncate">{value ? formatDMY(value) : placeholder}</span>
          </button>
        </Popover.Trigger>
        {clearable && value ? (
          <button
            type="button"
            aria-label="Очистить дату"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-ink-muted hover:bg-[#F2F3F7]"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <CalendarDays className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" aria-hidden />
        )}
      </div>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[60] rounded-2xl border border-line bg-white p-3 shadow-soft data-[state=open]:animate-[dropIn_140ms_ease-out]"
        >
          <DayPicker
            mode="single"
            locale={ru}
            weekStartsOn={1}
            selected={selected}
            defaultMonth={selected}
            disabled={[...(min ? [{ before: isoToDate(min) }] : []), ...(max ? [{ after: isoToDate(max) }] : [])]}
            onSelect={(d) => {
              if (d) {
                onChange(dateToISO(d));
                setOpen(false);
              }
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="field pl-10 pr-9"
      />
      {value && (
        <button
          type="button"
          aria-label="Очистить поиск"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-lg text-ink-muted hover:bg-[#F2F3F7]"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  label: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-[14px] bg-[#F2F3F7] p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] font-medium transition duration-150',
              size === 'sm' ? 'h-8 px-3 text-[12.5px]' : 'h-9 px-3.5 text-[13.5px]',
              active ? 'bg-white text-rose-600 shadow-[0_1px_3px_rgba(24,32,51,0.08)]' : 'text-ink-soft hover:text-ink',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
