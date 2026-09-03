import { cn } from '../../utils/format';

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface/70 px-6 py-12 text-center sm:py-16">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal/10 text-2xl text-teal">
        ◇
      </div>
      <h3 className="text-xl font-bold text-ink">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <div className="rounded-2xl border border-danger/20 bg-danger/5 px-6 py-10 text-center">
      <p className="font-semibold text-danger">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 text-sm font-bold text-ink underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-line/70 ${className}`} />;
}

export function PageHeader({ title, subtitle, actions, className }) {
  return (
    <div
      className={cn(
        'mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between',
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
