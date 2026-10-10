import * as RTooltip from '@radix-ui/react-tooltip';
import { MotionConfig } from 'framer-motion';
import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { TasksPage } from './pages/TasksPage';
import { AboutPage } from './pages/AboutPage';
import { StatsPage } from './pages/StatsPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <RTooltip.Provider delayDuration={150}>
        <AppProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<HomePage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="stats" element={<StatsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
          <Toaster
            position="bottom-right"
            closeButton
            offset={20}
            toastOptions={{
              classNames: {
                toast: 'rounded-2xl border border-line shadow-soft font-sans',
                title: 'text-[14px] font-semibold text-ink',
                description: 'text-[12.5px] text-ink-muted',
                actionButton: '!bg-rose-500 !text-white !rounded-lg !font-semibold',
              },
            }}
          />
        </AppProvider>
      </RTooltip.Provider>
    </MotionConfig>
  );
}
