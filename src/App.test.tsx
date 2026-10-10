import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';

beforeAll(() => {
  // jsdom не реализует matchMedia
  window.matchMedia ??= ((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  window.scrollTo = (() => {}) as typeof window.scrollTo;
  // 10.10.2026 12:00 по Афинам — дата снимка Excel
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
  vi.setSystemTime(new Date('2026-10-10T09:00:00Z'));
});

afterAll(() => vi.useRealTimers());

describe('App smoke', () => {
  it('renders the home page from the real Excel data', async () => {
    render(
      <MemoryRouter initialEntries={['/']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Поступление на Psychology BA', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(await screen.findByText('18%')).toBeInTheDocument();
    expect(screen.getByText('Через 3 дня дедлайн — можно потихоньку готовиться')).toBeInTheDocument();
    expect(screen.getAllByText('97 дней').length).toBeGreaterThan(0);
    const upcoming = screen.getByRole('heading', { name: /Ближайшие задачи/ }).closest('section')!;
    expect(within(upcoming).getByText(/Отправить ТЗ агентству/)).toBeInTheDocument();
  });

  it('renders the task plan with all 9 stages', async () => {
    render(
      <MemoryRouter initialEntries={['/tasks']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Этап 0. Duolingo 115–120', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText('Этап 8. Переезд')).toBeInTheDocument();
    expect(screen.getByText(/Показано 49 задач из 49/)).toBeInTheDocument();
  });
});
