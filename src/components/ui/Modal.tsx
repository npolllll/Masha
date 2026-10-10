import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './cn';

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  hideClose,
  footer,
  initialFocusSelector,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
  hideClose?: boolean;
  footer?: ReactNode;
  initialFocusSelector?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#1b2234]/30 backdrop-blur-[6px] data-[state=open]:animate-[fadeIn_160ms_ease-out]" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            if (!initialFocusSelector) return;
            const el = (e.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>(initialFocusSelector);
            if (el) {
              e.preventDefault();
              el.focus();
            }
          }}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[22px] bg-white shadow-float outline-none data-[state=open]:animate-[popIn_200ms_cubic-bezier(.2,.9,.3,1.1)]',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 px-6 pb-2 pt-6 sm:px-7">
            <div className="min-w-0">
              <Dialog.Title className="text-[19px] font-bold leading-tight text-ink">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{description}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">Диалоговое окно</Dialog.Description>
              )}
            </div>
            {!hideClose && (
              <Dialog.Close
                aria-label="Закрыть"
                className="-mr-2 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ink-muted transition hover:bg-[#F2F3F7] hover:text-ink"
              >
                <X className="h-5 w-5" />
              </Dialog.Close>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-2 sm:px-7 scrollbar-thin">{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-3 px-6 pb-6 pt-4 sm:px-7">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
