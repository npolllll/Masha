import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  options,
  onClose,
}: {
  options: ConfirmOptions | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(options)}
      onOpenChange={(o) => !o && onClose()}
      title={options?.title ?? ''}
      description={options?.description}
      className="max-w-[440px]"
      footer={
        <>
          <Button variant="secondary" size="lg" className="min-w-[120px]" onClick={onClose}>
            {options?.cancelLabel ?? 'Отмена'}
          </Button>
          <Button
            variant={options?.tone === 'danger' ? 'danger' : 'primary'}
            size="lg"
            className="min-w-[140px]"
            onClick={async () => {
              const fn = options?.onConfirm;
              onClose();
              await fn?.();
            }}
          >
            {options?.confirmLabel ?? 'Подтвердить'}
          </Button>
        </>
      }
    />
  );
}
