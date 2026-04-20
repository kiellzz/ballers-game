import { useCallback } from 'react';
import type { Toast } from '../../hooks/useToast';
import './ToastContainer.css';

interface Props {
  toasts: Toast[];
  onRemove: (id: number) => void;
}

export default function ToastContainer({ toasts, onRemove }: Props) {
  const createRemoveHandler = useCallback((id: number) => {
    return () => onRemove(id);
  }, [onRemove]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            className={`toast ${isSuccess ? 'toast--success' : 'toast--error'}`}
            onClick={createRemoveHandler(toast.id)}
          >
            {/* Icon */}
            <div className="toast__icon">{isSuccess ? '✅' : '⚠️'}</div>

            <div className="toast__body">
              {/* Títle*/}
              <span className="toast__title">
                {isSuccess ? 'Success!' : 'Unavailable Player'}
              </span>

              {/* Message*/}
              <span className="toast__message">
                {isSuccess ? (
                  <>
                    <strong>Your squad</strong> has been <strong>successfully saved!</strong>
                  </>
                ) : (
                  <>
                    <strong>{toast.playerName}</strong> can't play as{' '}
                    <strong>{toast.playerPosition}</strong> in this formation
                  </>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
