import { useEffect, useState } from 'react';
import { isValidISODate } from '@/domain/dates';

/**
 * Текущее время: обновляется каждые 60 секунд, а также при focus / visibilitychange —
 * это корректно отрабатывает смену дня и ручное изменение системного времени.
 */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, intervalMs);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);
  return now;
}

/**
 * Режим проверки: ?today=YYYY-MM-DD в адресе подменяет «сегодня» (для QA сценариев
 * просрочки/дедлайна). Без параметра используется реальная дата в выбранной таймзоне.
 */
export function readTodayOverride(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = new URLSearchParams(window.location.search).get('today');
    if (v && isValidISODate(v)) {
      sessionStorage.setItem('masha:today-override', v);
      return v;
    }
    if (v === 'off' || v === '') {
      sessionStorage.removeItem('masha:today-override');
      return null;
    }
    const stored = sessionStorage.getItem('masha:today-override');
    return stored && isValidISODate(stored) ? stored : null;
  } catch {
    return null;
  }
}
