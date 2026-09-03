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
        'mb-4 flex flex-col gap-2.5 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-3',
        className
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-muted sm:mt-1 sm:text-sm">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">{actions}</div>
      )}
    </div>
  );
}
