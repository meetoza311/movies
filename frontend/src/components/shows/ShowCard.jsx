import { Link } from 'react-router-dom';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { formatCurrency, formatDate, formatTime, showStatusLabel } from '../../utils/format';

export default function ShowCard({ show, onEdit, onDelete }) {
  const movie = show.movieId;
  const seats = show.seats || {};
  const total = seats.total ?? show.totalSeats ?? 0;
  const available = seats.available ?? 0;
  const booked = seats.booked ?? 0;
  const fill = total > 0 ? Math.round((booked / total) * 100) : 0;

  return (
    <article className="rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-ink">
            {typeof movie === 'object' ? movie.title : 'Movie'}
          </p>
          <p className="mt-1 text-sm text-muted">
            {formatDate(show.showDate)} · {formatTime(show.startTime)} – {formatTime(show.endTime)}
          </p>
        </div>
        <Badge tone={show.status}>{showStatusLabel(show.status)}</Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <Stat label="Total" value={total} tone="bg-paper" />
        <Stat label="Available" value={available} tone="bg-success/10 text-success" />
        <Stat label="Filled" value={booked} tone="bg-teal/10 text-teal" />
        <Stat label="Price" value={formatCurrency(show.seatPrice)} tone="bg-gold-soft text-warn" />
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[11px] font-semibold text-muted">
          <span>Seat fill</span>
          <span>{fill}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-line/70">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold to-teal"
            style={{ width: `${fill}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/shows/${show._id}`}>
          <Button size="sm">Manage Seats</Button>
        </Link>
        <Button size="sm" variant="outline" onClick={() => onEdit?.(show)}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete?.(show)}>
          Delete
        </Button>
      </div>
    </article>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`rounded-xl px-3 py-2 ${tone}`}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 font-semibold text-ink">{value}</p>
    </div>
  );
}
