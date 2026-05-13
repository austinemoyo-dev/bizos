import { useRef } from 'react';
import { useUIStore } from '@/lib/stores/uiStore';

interface UseUndoDeleteOptions {
  label: string;
  delay?: number;
}

/**
 * Returns `deleteWithUndo(fn)` — shows an Undo toast and only calls `fn`
 * after `delay` ms (default 5s) if the user hasn't clicked Undo.
 */
export function useUndoDelete({ label, delay = 5000 }: UseUndoDeleteOptions) {
  const { addToast, removeToast } = useUIStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const deleteWithUndo = (fn: () => Promise<void> | void) => {
    cancelledRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);

    const cancel = () => {
      cancelledRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };

    const toastId = addToast({
      type: 'warning',
      title: label,
      message: `Will complete in ${delay / 1000}s.`,
      duration: delay + 500,
      action: { label: 'Undo', onClick: cancel },
    });

    timerRef.current = setTimeout(async () => {
      if (!cancelledRef.current) {
        removeToast(toastId);
        await fn();
      }
    }, delay);
  };

  return { deleteWithUndo };
}
