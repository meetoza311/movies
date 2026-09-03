import { cn } from '../../utils/format';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  loading,
  disabled,
  ...props
}) {
  const variants = {
    primary: 'bg-teal text-white hover:bg-teal-dark shadow-sm active:bg-teal-dark',
    secondary: 'bg-ink text-white hover:bg-ink-soft active:bg-ink-soft',
    outline:
      'border border-line bg-surface text-ink hover:border-teal hover:text-teal active:bg-paper',
    ghost: 'text-muted hover:bg-line/60 hover:text-ink active:bg-line/80',
    danger: 'bg-danger text-white hover:opacity-90',
    gold: 'bg-gold text-ink hover:brightness-95 active:brightness-90',
  };
  const sizes = {
    sm: 'min-h-9 px-3 py-2 text-sm',
    md: 'min-h-11 px-4 py-2.5 text-sm sm:min-h-10',
    lg: 'min-h-12 px-5 py-3 text-base',
    icon: 'min-h-10 min-w-10 p-2',
  };

  return (
    <button
      className={cn(
        'inline-flex touch-manipulation items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}
