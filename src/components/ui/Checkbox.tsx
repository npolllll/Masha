import { Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from './cn';

export function TaskCheckbox({
  checked,
  onToggle,
  label,
  disabled,
  className,
  size = 20,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
  className?: string;
  size?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'group inline-grid shrink-0 place-items-center rounded-[6px] border-[1.5px] transition duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'border-mint-500 bg-mint-500 text-white' : 'border-[#CDD1DA] bg-white text-transparent hover:border-rose-400',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <motion.span
        initial={false}
        animate={checked ? { scale: 1, opacity: 1 } : { scale: reduce ? 1 : 0.4, opacity: 0 }}
        transition={{ duration: 0.18 }}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={3} />
      </motion.span>
    </button>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition duration-200',
        checked ? 'bg-rose-500' : 'bg-[#D9DCE4]',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow transition duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
