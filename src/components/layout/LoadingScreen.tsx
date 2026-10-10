import { Skeleton } from '@/components/ui/Misc';

export function LoadingScreen() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-5">
      <span className="sr-only">Загружаем локальные данные…</span>
      <Skeleton className="h-[260px] rounded-[22px]" />
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <Skeleton className="h-[190px] rounded-[22px]" />
        <Skeleton className="h-[190px] rounded-[22px]" />
      </div>
      <div className="grid grid-cols-3 gap-3 md:grid-cols-9">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-[120px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-[220px] rounded-[22px]" />
    </div>
  );
}
