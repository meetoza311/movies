import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { showApi } from '../services/showApi';
import SeatMap from '../components/seats/SeatMap';
import { PageHeader, Skeleton, ErrorState } from '../components/common/States';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import {
  formatCurrency,
  formatDate,
  formatTime,
  showStatusLabel,
} from '../utils/format';

export default function ShowDetails() {
  const { id } = useParams();

  const showQuery = useQuery({
    queryKey: ['show', id],
    queryFn: () => showApi.get(id),
  });

  const seatsQuery = useQuery({
    queryKey: ['seats', id],
    queryFn: () => showApi.seats(id),
  });

  if (showQuery.isLoading) return <Skeleton className="h-96" />;
  if (showQuery.error) {
    return <ErrorState message={showQuery.error.message} onRetry={showQuery.refetch} />;
  }

  const show = showQuery.data.data;
  const movie = show.movieId;
  const seats = seatsQuery.data?.data?.seats || [];
  const stats = show.seats || seatsQuery.data?.data?.stats || {};

  return (
    <div>
      <PageHeader
        title={typeof movie === 'object' ? movie.title : 'Show details'}
        subtitle={`${formatDate(show.showDate)} · ${formatTime(show.startTime)} – ${formatTime(show.endTime)}`}
        actions={
          <>
            <Link to={`/shows/${show._id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
            <Link to={`/bookings/new?showId=${show._id}&movieId=${movie?._id || movie}`}>
              <Button>Book seats</Button>
            </Link>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total seats" value={stats.total ?? show.totalSeats} />
        <Stat label="Available" value={stats.available ?? '—'} />
        <Stat label="Booked" value={stats.booked ?? '—'} />
        <Stat label="Seat price" value={formatCurrency(show.seatPrice)} />
      </div>

      <div className="mb-4 flex items-center gap-2">
        <Badge tone={show.status}>{showStatusLabel(show.status)}</Badge>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6">
        {seatsQuery.isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <SeatMap seats={seats} readonly selected={[]} />
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-xl font-bold">Bookings for this show</h2>
        <div className="space-y-2">
          {(show.bookings || []).length === 0 && (
            <p className="text-sm text-muted">No bookings yet.</p>
          )}
          {(show.bookings || []).map((b) => (
            <Link
              key={b._id}
              to={`/bookings/${b._id}`}
              className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold">{b.bookingNumber}</p>
                <p className="text-sm text-muted">
                  {b.customerName} · {b.mobileNumber}
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span>{(b.seats || []).map((s) => s.seatNumber).join(', ')}</span>
                <Badge tone={b.bookingStatus}>{b.bookingStatus}</Badge>
                <span className="font-bold">{formatCurrency(b.totalAmount)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-ink">{value}</p>
    </div>
  );
}
