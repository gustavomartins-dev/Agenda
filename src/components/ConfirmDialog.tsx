import { Modal } from './Modal';
import { AlertIcon } from './Icons';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Excluir',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal title={title} onClose={onCancel} role="alertdialog" size="sm">
      <div className="confirm">
        <span className="confirm__icon" aria-hidden="true">
          <AlertIcon />
        </span>
        <p className="confirm__message">{message}</p>
      </div>
      <div className="modal__footer modal__footer--inline">
        <button type="button" className="button button--ghost" onClick={onCancel} data-autofocus>
          {cancelLabel}
        </button>
        <button type="button" className="button button--danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
