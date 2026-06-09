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

        const isResetSquadToast =
          isSuccess &&
          toast.playerName === 'Squad' &&
          toast.playerPosition?.toLowerCase() === 'squad reset';

        const isDeleteToast = isSuccess && toast.playerPosition === '__deleted__';
        const isCreateToast = isSuccess && toast.playerPosition === '__created__';
        const isRandomFillToast = isSuccess && toast.playerPosition === '__randomfill__';
        const isDuplicateToast = !isSuccess && toast.playerPosition === '__duplicate__';

        return (
          <div
            key={toast.id}
            className={`toast ${isSuccess ? 'toast--success' : 'toast--error'}`}
            onClick={createRemoveHandler(toast.id)}
          >
            <div className="toast__icon">
              {isDeleteToast ? '❌' : isSuccess ? '✅' : '⚠️'}
            </div>

            <div className="toast__body">
              <span className="toast__title">
                {isDeleteToast
                  ? 'Player removed'
                  : isCreateToast
                  ? 'Player created!'
                  : isRandomFillToast
                  ? 'Squad filled!'
                  : isDuplicateToast
                  ? 'Player already selected'
                  : isSuccess
                  ? 'Success!'
                  : 'Unavailable Player'}
              </span>

              <span className="toast__message">
                {isDeleteToast ? (
                  <><strong>{toast.playerName}</strong> was removed from your collection.</>
                ) : isCreateToast ? (
                  <><strong>{toast.playerName}</strong> was added to your collection!</>
                ) : isRandomFillToast ? (
                  <>Your squad has been <strong>randomly filled!</strong></>
                ) : isDuplicateToast ? (
                  <><strong>{toast.playerName}</strong> is already in your squad.</>
                ) : toast.message ? (
                  <span dangerouslySetInnerHTML={{ __html: toast.message }} />
                ) : isSuccess ? (
                  isResetSquadToast ? (
                    <><strong>Your squad</strong> has been <strong>reset!</strong></>
                  ) : (
                    <><strong>Your squad</strong> has been <strong>successfully saved!</strong></>
                  )
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
