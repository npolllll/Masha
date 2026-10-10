import { Compass } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui/Misc';

export function NotFoundPage() {
  return (
    <div className="card">
      <EmptyState
        icon={<Compass className="h-6 w-6" />}
        title="Такой страницы нет"
        action={
          <Link to="/" className="inline-flex h-10 items-center rounded-xl bg-rose-500 px-4 text-[14px] font-semibold text-white shadow-pink">
            На главную
          </Link>
        }
      >
        Похоже, ссылка устарела. Все разделы — в меню слева.
      </EmptyState>
    </div>
  );
}
