import { BarChart3, BookText, ClipboardList, History, Home, Settings as SettingsIcon } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { formatLong } from '@/domain/dates';
import { cn } from '@/components/ui/cn';
import { GlobalModals } from './GlobalModals';
import { LoadingScreen } from './LoadingScreen';

const NAV = [
  { to: '/', label: 'Главная', short: 'Главная', icon: Home, end: true },
  { to: '/tasks', label: 'План и задачи', short: 'План', icon: ClipboardList },
  { to: '/about', label: 'Описание', short: 'Описание', icon: BookText },
  { to: '/stats', label: 'Статистика', short: 'Статистика', icon: BarChart3 },
  { to: '/settings', label: 'Настройки', short: 'Настройки', icon: SettingsIcon },
];

function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#E7E6FB] to-[#DADBF7] text-[13px] font-semibold text-[#4B4F86]',
        className,
      )}
    >
      {initials}
    </span>
  );
}

function Sidebar() {
  const { settings, today, openHistory, todayOverridden } = useApp();
  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col border-r border-line/70 bg-[#F3F5F8] px-4 pb-5 pt-7 lg:flex"
      aria-label="Основная навигация"
    >
      <div className="px-3">
        <p className="text-[22px] font-bold leading-none tracking-[-0.01em] text-ink">Masha</p>
        <p className="mt-2 text-[13px] text-ink-muted">Psychology BA · 2027</p>
      </div>
      <nav className="mt-9 flex flex-col gap-1.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'group flex h-11 items-center gap-3 rounded-xl px-3 text-[14.5px] font-medium transition duration-150',
                isActive ? 'bg-rose-100/80 text-rose-600' : 'text-ink-soft hover:bg-white hover:text-ink',
              )
            }
          >
            <Icon className="h-[19px] w-[19px]" strokeWidth={1.9} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto space-y-4">
        <button
          type="button"
          onClick={() => openHistory()}
          className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium text-ink-soft transition hover:bg-white hover:text-ink"
        >
          <History className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
          История изменений
        </button>
        <div className="rounded-2xl bg-white/80 px-3 py-2.5 text-[12px] text-ink-muted">
          Сегодня
          <span className={cn('block text-[13px] font-semibold', todayOverridden ? 'text-amber-600' : 'text-ink')}>
            {formatLong(today)}
          </span>
          {todayOverridden && <span className="text-amber-600">режим проверки даты</span>}
        </div>
        <div className="flex items-center gap-3 px-1">
          <Avatar initials={settings.avatarInitials || 'MP'} />
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-ink">{settings.userName}</p>
            <p className="truncate text-[12px] text-ink-muted">Psychology BA 2027</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileTopBar() {
  const { settings, openHistory } = useApp();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line/70 bg-[#F7F8FB]/90 px-4 backdrop-blur lg:hidden">
      <div className="flex items-baseline gap-2">
        <span className="text-[18px] font-bold text-ink">Masha</span>
        <span className="text-[12px] text-ink-muted">Psychology BA · 2027</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="История изменений"
          onClick={() => openHistory()}
          className="grid h-9 w-9 place-items-center rounded-xl text-ink-soft hover:bg-white"
        >
          <History className="h-[18px] w-[18px]" />
        </button>
        <Avatar initials={settings.avatarInitials || 'MP'} className="h-8 w-8 text-[11px]" />
      </div>
    </header>
  );
}

function MobileBottomNav() {
  return (
    <nav
      aria-label="Навигация"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-white/95 px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur lg:hidden"
    >
      {NAV.map(({ to, short, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10.5px] font-medium transition',
              isActive ? 'text-rose-600' : 'text-ink-muted',
            )
          }
        >
          {({ isActive }) => (
            <>
              <span className={cn('grid h-7 w-12 place-items-center rounded-full transition', isActive && 'bg-rose-100/80')}>
                <Icon className="h-[19px] w-[19px]" strokeWidth={1.9} aria-hidden />
              </span>
              {short}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppLayout() {
  const { ready, initError } = useApp();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <div className="min-h-screen bg-page">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:shadow-soft"
      >
        К содержимому
      </a>
      <Sidebar />
      <MobileTopBar />
      <main id="main" className="pb-28 lg:pb-12 lg:pl-[240px]">
        <div className="mx-auto w-full max-w-content px-4 pt-5 sm:px-6 lg:px-8 lg:pt-7">
          {initError ? (
            <div className="card p-8 text-center">
              <p className="text-[16px] font-semibold">Не удалось открыть локальную базу данных</p>
              <p className="mt-2 text-[14px] text-ink-muted">{initError}</p>
              <p className="mt-2 text-[13px] text-ink-muted">
                Проверьте, что браузер разрешает IndexedDB (в приватном режиме некоторые браузеры её отключают).
              </p>
            </div>
          ) : ready ? (
            <Outlet />
          ) : (
            <LoadingScreen />
          )}
        </div>
      </main>
      <MobileBottomNav />
      {ready && <GlobalModals />}
    </div>
  );
}
