import { cn } from '../../utils/format';

export function Input({ label, error, className, ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-sm font-semibold text-ink">{label}</span>}
      <input
        className={cn(
          'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20',
          error && 'border-danger focus:border-danger focus:ring-danger/20',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  );
}

export function TextArea({ label, error, className, ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-sm font-semibold text-ink">{label}</span>}
      <textarea
        className={cn(
          'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20',
          error && 'border-danger',
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  );
}

export function Select({ label, error, children, className, ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && <span className="text-sm font-semibold text-ink">{label}</span>}
      <select
        className={cn(
          'w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20',
          error && 'border-danger',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  );
}
