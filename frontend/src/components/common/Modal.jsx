import { Button } from './Button';
import { cn } from '../../utils/format';

export function Modal({ open, title, children, onClose, footer, footerClassName }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5 sm:py-4">
          <h3 className="min-w-0 font-display text-lg font-bold leading-tight text-ink sm:text-xl">
            {title}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 text-sm text-muted modal-scroll sm:px-5">
          {children}
        </div>
        {footer && (
          <div
            className={cn(
              'flex w-full shrink-0 flex-wrap gap-2 border-t border-line px-4 py-4 sm:justify-end sm:px-5',
              footerClassName
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger,
  loading,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" className="min-h-12 flex-1 sm:min-h-11 sm:flex-none" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            className="min-h-12 flex-1 sm:min-h-11 sm:flex-none"
            loading={loading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="whitespace-pre-line text-ink">{message}</p>
    </Modal>
  );
}
