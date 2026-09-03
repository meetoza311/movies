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
    primary: 'bg-teal text-white hover:bg-teal-dark shadow-sm',
    secondary: 'bg-ink text-white hover:bg-ink-soft',
    outline: 'border border-line bg-surface text-ink hover:border-teal hover:text-teal',
    ghost: 'text-muted hover:bg-line/60 hover:text-ink',
    danger: 'bg-danger text-white hover:opacity-90',
    gold: 'bg-gold text-ink hover:brightness-95',
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-60',
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
