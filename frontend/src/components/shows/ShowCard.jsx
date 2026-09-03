import { Link } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
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
    <article className="rounded-2xl border border-line bg-surface p-3.5 shadow-sm transition sm:p-4 sm:hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-ink sm:text-lg">
            {typeof movie === 'object' ? movie.title : 'Movie'}
          </p>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            {formatDate(show.showDate)} · {formatTime(show.startTime)} – {formatTime(show.endTime)}
          </p>
        </div>
        <Badge tone={show.status}>{showStatusLabel(show.status)}</Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:mt-4 sm:grid-cols-5">
        <Stat label="Total" value={total} tone="bg-paper" />
        <Stat label="Available" value={available} tone="bg-success/10 text-success" />
        <Stat label="Filled" value={booked} tone="bg-teal/10 text-teal" />
        <Stat label="Owner" value={formatCurrency(show.ownerPrice ?? 50)} tone="bg-gold-soft text-warn" />
        <Stat label="Guest" value={formatCurrency(show.guestPrice ?? show.seatPrice ?? 80)} tone="bg-sky/10 text-sky" />
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

      <div className="mt-3 flex items-center gap-2 sm:mt-4">
        <Link to={`/shows/${show._id}`} className="min-w-0 flex-1">
          <Button size="sm" className="w-full">
            Manage seats
          </Button>
        </Link>
        <Button
          size="icon"
          variant="outline"
          onClick={() => onEdit?.(show)}
          aria-label="Edit show"
        >
          <Pencil size={15} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onDelete?.(show)}
          aria-label="Delete show"
        >
          <Trash2 size={15} />
        </Button>
      </div>
    </article>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div className={`rounded-xl px-2.5 py-2 sm:px-3 ${tone}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted sm:text-[11px]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
