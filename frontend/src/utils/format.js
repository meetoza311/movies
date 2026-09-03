export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(value) {
  if (!value) return '—';
  if (/^\d{1,2}:\d{2}$/.test(value)) {
    const [h, m] = value.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  return value;
}

export function movieStatusLabel(status) {
  return {
    upcoming: 'Upcoming',
    now_showing: 'Now Showing',
    completed: 'Completed',
  }[status] || status;
}

export function showStatusLabel(status) {
  return {
    scheduled: 'Scheduled',
    completed: 'Completed',
    cancelled: 'Cancelled',
  }[status] || status;
}

export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}
