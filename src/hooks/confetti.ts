import confetti from 'canvas-confetti';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const COLORS = ['#FF2D70', '#FF9DBA', '#20C997', '#F2A33A', '#7C6FE6', '#4DA3FF'];

/** Короткий залп конфетти; уважает prefers-reduced-motion. */
export function fireConfetti(): void {
  if (prefersReducedMotion()) return;
  try {
    const base = { disableForReducedMotion: true, colors: COLORS, ticks: 160, zIndex: 80, scalar: 0.9 } as const;
    void confetti({ ...base, particleCount: 70, spread: 75, startVelocity: 38, origin: { x: 0.5, y: 0.38 } });
    window.setTimeout(() => {
      void confetti({ ...base, particleCount: 35, angle: 60, spread: 55, origin: { x: 0.2, y: 0.5 } });
      void confetti({ ...base, particleCount: 35, angle: 120, spread: 55, origin: { x: 0.8, y: 0.5 } });
    }, 140);
  } catch {
    /* canvas недоступен — просто без конфетти */
  }
}
