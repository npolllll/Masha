import { CalendarDays, Flag, MapPin } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatDayMonth, formatDMY, formatLong } from '@/domain/dates';
import { clamp, countdown, positionPct } from '@/domain/timeline';
import { HeroCity } from '@/components/illustrations/HeroCity';
import { Segmented } from '@/components/ui/Fields';
import { cn } from '@/components/ui/cn';

type Scale = 'deadline' | 'full';
const SCALE_KEY = 'masha:hero-scale';

function readScale(): Scale {
  try {
    return localStorage.getItem(SCALE_KEY) === 'full' ? 'full' : 'deadline';
  } catch {
    return 'deadline';
  }
}

const LABEL_W = 200;

export function Hero() {
  const { settings, today, planEnd } = useApp();
  const [scale, setScaleState] = useState<Scale>(readScale);
  const setScale = (s: Scale) => {
    setScaleState(s);
    try {
      localStorage.setItem(SCALE_KEY, s);
    } catch {
      /* без сохранения */
    }
  };
  const start = settings.planStart;
  const end = scale === 'deadline' ? settings.deadline : planEnd;
  const pos = positionPct(today, start, end);
  const deadlinePos = positionPct(settings.deadline, start, end);
  const targetPos = positionPct(settings.submitTarget, start, end);
  const cd = countdown(today, settings.deadline);

  const trackRef = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    setW(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const todayX = (w * pos) / 100;
  const deadX = (w * deadlinePos) / 100;
  const todayLeft = clamp(todayX - 12, 0, Math.max(0, w - LABEL_W));
  const deadLeft = clamp(deadX - LABEL_W + 12, 0, Math.max(0, w - LABEL_W));
  const collide = todayLeft + LABEL_W > deadLeft && w > 0;

  return (
    <section aria-label="Обзор поступления" className="relative">
      <div className="relative h-[300px] overflow-hidden rounded-[22px] bg-[#DCE6F2] sm:h-[318px]">
        <HeroCity className="absolute inset-0 h-full w-full" />
        <div className="relative z-10 flex items-start justify-between gap-6 p-6 sm:p-8">
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-ink-soft sm:text-[15px]">Хорошего дня, {settings.userName}! 🌷</p>
            <h1 className="mt-2.5 text-[27px] font-bold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[38px]">
              Поступление на Psychology BA
            </h1>
            <p className="mt-2.5 text-[16px] text-ink-soft sm:text-[19px]">Западная Европа · сентябрь 2027</p>
          </div>
          <div className="hidden shrink-0 items-center gap-3.5 rounded-2xl bg-white/95 px-4 py-3 shadow-card backdrop-blur md:flex">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-50 text-rose-500">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[15px] font-bold text-ink">{formatLong(settings.deadline)}</p>
              <p className="text-[13px] text-ink-muted">общий дедлайн подачи</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-2 -mt-[104px] rounded-[20px] border border-white/60 bg-white/95 px-5 pb-5 pt-5 shadow-soft backdrop-blur sm:mx-5 sm:px-8 sm:pt-6">
        {/* Подписи: на мобильных — строкой, на sm+ — привязаны к маркерам */}
        <div className="mb-3 flex items-start justify-between gap-3 sm:hidden">
          <TodayLabel today={today} />
          <div className="text-right leading-tight">
            <p className="text-[12px] text-ink-muted">{cd.kind === 'past' ? 'Ориентир прошёл' : cd.kind === 'today' ? 'Дедлайн' : 'До дедлайна'}</p>
            <p className="mt-1 whitespace-nowrap text-[19px] font-bold text-ink">{cd.value}</p>
          </div>
        </div>

        <div ref={trackRef} className={cn('relative', collide ? 'sm:h-[136px]' : 'sm:h-[92px]')}>
          <div className="hidden sm:block">
            {!collide && (
              <div className="absolute top-0" style={{ left: todayLeft, width: LABEL_W }}>
                <TodayLabel today={today} />
              </div>
            )}
            <div className="absolute top-0 flex justify-end" style={{ left: deadLeft, width: LABEL_W }}>
              <DeadlineLabel value={cd.value} kind={cd.kind} align="right" />
            </div>
            {/* вертикальные линии к маркерам */}
            {!collide && <span aria-hidden className="absolute top-[44px] h-[26px] w-[2px] -translate-x-1/2 rounded bg-rose-400" style={{ left: todayX }} />}
            <span aria-hidden className="absolute top-[44px] h-[26px] w-[2px] -translate-x-1/2 rounded bg-rose-300" style={{ left: deadX }} />
          </div>

          <div className="relative h-6 sm:absolute sm:inset-x-0 sm:top-[66px]">
            <div
              className="absolute inset-x-0 top-1/2 h-[10px] -translate-y-1/2 rounded-full bg-[#EEF0F4]"
              role="progressbar"
              aria-label={`Шкала времени: сегодня ${formatLong(today)}, общий дедлайн ${formatLong(settings.deadline)}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pos)}
            />
            <div
              className="absolute left-0 top-1/2 h-[10px] -translate-y-1/2 rounded-full bg-gradient-to-r from-rose-200 to-rose-300 transition-[width] duration-500"
              style={{ width: `${pos}%` }}
            />
            {targetPos > 0 && targetPos < 100 && (
              <span
                aria-hidden
                title={`${formatDMY(settings.submitTarget)} — отправляем свои заявки`}
                className="absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded bg-amber-500"
                style={{ left: `${targetPos}%` }}
              />
            )}
            <span
              aria-hidden
              className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-rose-400 shadow"
              style={{ left: `${deadlinePos}%` }}
            />
            <span
              aria-hidden
              className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-rose-500 shadow-[0_2px_8px_rgba(255,45,112,0.45)] transition-[left] duration-500"
              style={{ left: `${pos}%` }}
            />
          </div>
          {collide && (
            <div className="absolute top-[94px] hidden sm:block" style={{ left: todayLeft, width: LABEL_W }}>
              <TodayLabel today={today} />
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-3.5 text-[12.5px] text-ink-muted">
          <p aria-live="polite">
            <span className={cn('font-semibold', cd.kind === 'past' ? 'text-amber-600' : 'text-ink')}>{cd.label}</span>
            <span className="mx-1.5">·</span>
            шкала {formatDMY(start)} → {formatDMY(end)}
            <span className="mx-1.5 hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              <span className="mr-1 inline-block h-2.5 w-[3px] rounded bg-amber-500 align-middle" /> {formatDayMonth(settings.submitTarget)} — отправляем свои
              заявки
            </span>
          </p>
          <Segmented
            size="sm"
            label="Масштаб шкалы"
            value={scale}
            onChange={setScale}
            options={[
              { value: 'deadline', label: 'До дедлайна' },
              { value: 'full', label: 'Весь план' },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function TodayLabel({ today }: { today: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500">
        <MapPin className="h-[18px] w-[18px]" />
      </span>
      <div className="leading-tight">
        <p className="text-[13px] font-semibold text-rose-600">Сегодня</p>
        <p className="mt-1 whitespace-nowrap text-[13px] text-rose-500">{formatLong(today)}</p>
      </div>
    </div>
  );
}

function DeadlineLabel({ value, kind, align }: { value: string; kind: 'future' | 'today' | 'past'; align: 'left' | 'right' }) {
  return (
    <div className={cn('flex items-start gap-2.5', align === 'right' && 'text-left')}>
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-500">
        <Flag className="h-[18px] w-[18px]" />
      </span>
      <div className="leading-tight">
        <p className="whitespace-nowrap text-[13px] text-ink-muted">
          {kind === 'past' ? 'Общий ориентир прошёл' : kind === 'today' ? 'Общий дедлайн' : 'До общего дедлайна'}
        </p>
        <p className="mt-1 whitespace-nowrap text-[20px] font-bold text-ink">{value}</p>
      </div>
    </div>
  );
}
