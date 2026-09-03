import { cn } from '../../utils/format';

const styles = {
  upcoming: 'bg-gold-soft text-warn',
  now_showing: 'bg-teal/10 text-teal-dark',
  completed: 'bg-line text-muted',
  scheduled: 'bg-teal/10 text-teal-dark',
  cancelled: 'bg-danger/10 text-danger',
  CONFIRMED: 'bg-success/10 text-success',
  CANCELLED: 'bg-danger/10 text-danger',
  default: 'bg-line text-muted',
};

export function Badge({ children, tone = 'default', className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide',
        styles[tone] || styles.default,
        className
      )}
    >
      {children}
    </span>
  );
}
