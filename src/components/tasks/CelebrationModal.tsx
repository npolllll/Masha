import * as Dialog from '@radix-ui/react-dialog';
import { Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useApp } from '@/context/AppContext';
import { Button } from '@/components/ui/Button';

/** Статичные «конфетти»-частицы вокруг карточки (как на референсе). */
const PIECES = [
  { x: 6, y: 18, c: '#F2A33A', r: 20, w: 10, h: 5 },
  { x: 14, y: 6, c: '#20C997', r: -30, w: 8, h: 8 },
  { x: 24, y: 24, c: '#7C6FE6', r: 45, w: 9, h: 9 },
  { x: 32, y: 4, c: '#4DA3FF', r: 15, w: 6, h: 10 },
  { x: 44, y: 14, c: '#FF2D70', r: 60, w: 5, h: 5 },
  { x: 58, y: 2, c: '#F2A33A', r: -20, w: 10, h: 5 },
  { x: 66, y: 20, c: '#FF9DBA', r: 10, w: 7, h: 7 },
  { x: 76, y: 8, c: '#4DA3FF', r: -45, w: 6, h: 10 },
  { x: 86, y: 18, c: '#7C6FE6', r: 30, w: 9, h: 9 },
  { x: 94, y: 6, c: '#20C997', r: 0, w: 8, h: 8 },
  { x: 90, y: 34, c: '#FF2D70', r: 70, w: 8, h: 4 },
  { x: 8, y: 36, c: '#FF9DBA', r: -60, w: 6, h: 6 },
];

export function CelebrationModal() {
  const { celebration, closeCelebration, goToNextTask } = useApp();
  const reduce = useReducedMotion();
  return (
    <Dialog.Root open={Boolean(celebration)} onOpenChange={(o) => !o && closeCelebration()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[55] bg-[#1b2234]/30 backdrop-blur-[6px] data-[state=open]:animate-[fadeIn_160ms_ease-out]" />
        <Dialog.Content
          aria-describedby="celebration-text"
          className="fixed left-1/2 top-1/2 z-[56] w-[calc(100vw-32px)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[24px] bg-white px-7 pb-7 pt-10 text-center shadow-float outline-none data-[state=open]:animate-[popIn_220ms_cubic-bezier(.2,.9,.3,1.2)]"
        >
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40">
            {PIECES.map((p, i) => (
              <motion.span
                key={i}
                className="absolute rounded-[2px]"
                style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.w, height: p.h, background: p.c, rotate: p.r }}
                initial={reduce ? false : { y: -30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.03, duration: 0.45, ease: 'easeOut' }}
              />
            ))}
          </div>
          <motion.div
            initial={reduce ? false : { scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.05 }}
            className="relative mx-auto grid h-[84px] w-[84px] place-items-center rounded-full bg-rose-500 text-white shadow-pink"
          >
            <Check className="h-10 w-10" strokeWidth={3} />
          </motion.div>
          <Dialog.Title className="mt-6 text-[22px] font-bold text-ink">Задача выполнена! 🎉</Dialog.Title>
          <p id="celebration-text" className="mx-auto mt-2.5 max-w-[300px] text-[14.5px] leading-relaxed text-ink-muted">
            Мы стали на шаг ближе к поступлению!
            <br />
            Отличная работа!
          </p>
          {celebration && (
            <p className="mx-auto mt-3 line-clamp-2 max-w-[340px] rounded-xl bg-[#F7F8FB] px-3 py-2 text-[13px] text-ink-soft">
              <b className="text-ink">{celebration.id}</b> {celebration.title}
            </p>
          )}
          <div className="mt-7 grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3">
            <Button variant="secondary" size="lg" className="px-3" onClick={closeCelebration}>
              Закрыть
            </Button>
            <Button size="lg" className="whitespace-nowrap px-3" onClick={goToNextTask}>
              Перейти к следующей
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
