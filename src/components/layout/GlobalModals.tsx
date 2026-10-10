import { useApp } from '@/context/AppContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { CelebrationModal } from '@/components/tasks/CelebrationModal';
import { HistoryDrawer } from '@/components/tasks/HistoryDrawer';
import { TaskDetailsModal } from '@/components/tasks/TaskDetailsModal';
import { TaskFormModal } from '@/components/tasks/TaskFormModal';

export function GlobalModals() {
  const { confirmOptions, closeConfirm } = useApp();
  return (
    <>
      <TaskFormModal />
      <TaskDetailsModal />
      <CelebrationModal />
      <HistoryDrawer />
      <ConfirmDialog options={confirmOptions} onClose={closeConfirm} />
    </>
  );
}
