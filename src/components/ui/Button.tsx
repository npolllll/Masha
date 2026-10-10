import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'soft';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'iconSm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-rose-500 text-white shadow-pink hover:bg-rose-600 active:bg-rose-700 disabled:bg-rose-300 disabled:shadow-none',
  secondary: 'bg-[#F2F3F7] text-ink hover:bg-[#E9EBF1] active:bg-[#E2E5EC]',
  ghost: 'bg-transparent text-ink-soft hover:bg-[#F2F3F7] hover:text-ink',
  outline: 'border border-line bg-white text-ink hover:border-[#dcdfe7] hover:bg-[#FAFBFC]',
  danger: 'bg-[#E5484D] text-white hover:bg-[#D63C41] shadow-[0_10px_24px_-12px_rgba(229,72,77,0.6)]',
  soft: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[10px]',
  md: 'h-10 px-4 text-[14px] gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-[14px]',
  icon: 'h-10 w-10 rounded-xl',
  iconSm: 'h-8 w-8 rounded-[10px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
