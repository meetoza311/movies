import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { showApi } from '../services/showApi';
import { bookingApi } from '../services/bookingApi';
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

function seatLabel(seats = []) {
  return seats
    .map((s) => {
      const cat = String(s.category || 'GUEST').toUpperCase() === 'OWNER' ? 'O' : 'G';
      return `${s.seatNumber}(${cat})`;
    })
    .join(', ');
}

export default function ShowDetails() {
  const { id } = useParams();
  const qc = useQueryClient();

  const showQuery = useQuery({
    queryKey: ['show', id],
    queryFn: () => showApi.get(id),
  });

  const seatsQuery = useQuery({
    queryKey: ['seats', id],
    queryFn: () => showApi.seats(id),
  });

  const gateQuery = useQuery({
    queryKey: ['gate', id],
    queryFn: () => bookingApi.gateList(id),
    enabled: Boolean(id),
  });

  const allotMutation = useMutation({
    mutationFn: (booking) =>
      bookingApi.gateCheckIn({
        code: booking.scanToken || booking.bookingNumber,
        showId: id,
        method: 'MANUAL',
      }),
    onSuccess: () => {
      toast.success('Ticket allotted');
      qc.invalidateQueries({ queryKey: ['gate', id] });
      qc.invalidateQueries({ queryKey: ['seats', id] });
      qc.invalidateQueries({ queryKey: ['show', id] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Allot failed');
    },
  });

  if (showQuery.isLoading) return <Skeleton className="h-96" />;
  if (showQuery.error) {
    return <ErrorState message={showQuery.error.message} onRetry={showQuery.refetch} />;
  }

  const show = showQuery.data.data;
  const movie = show.movieId;
  const seats = seatsQuery.data?.data?.seats || [];
  const stats = {
    ...(show.seats || {}),
    ...(seatsQuery.data?.data?.stats || {}),
  };

  const gateBookings = gateQuery.data?.data || [];
  const remaining = gateBookings.filter(
    (b) => b.bookingStatus === 'CONFIRMED' && b.checkInStatus !== 'CHECKED_IN'
  );
  const done = gateBookings.filter((b) => b.checkInStatus === 'CHECKED_IN');
  const pendingSeats = stats.pendingAllotSeats ?? remaining.reduce((n, b) => n + (b.seats?.length || 0), 0);
  const allottedSeats = stats.allottedSeats ?? done.reduce((n, b) => n + (b.seats?.length || 0), 0);

  return (
    <div>
      <PageHeader
        title={typeof movie === 'object' ? movie.title : 'Show details'}
        subtitle={`${formatDate(show.showDate)} · ${formatTime(show.startTime)} – ${formatTime(show.endTime)}`}
        actions={
          <>
            <Link to={`/verify`}>
              <Button variant="outline">Open scanner</Button>
            </Link>
            <Link to={`/shows/${show._id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
            <Link to={`/bookings/new?showId=${show._id}&movieId=${movie?._id || movie}`}>
              <Button>Book seats</Button>
            </Link>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total seats" value={stats.total ?? show.totalSeats} />
        <Stat label="Available" value={stats.available ?? '—'} />
        <Stat label="Booked" value={stats.booked ?? '—'} />
        <Stat label="Allotted seats" value={allottedSeats} />
        <Stat label="Remain to allot" value={pendingSeats} />
        <Stat
          label="Prices"
          value={`O ${formatCurrency(show.ownerPrice ?? 50)} / G ${formatCurrency(
            show.guestPrice ?? show.seatPrice ?? 80
          )}`}
          small
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone={show.status}>{showStatusLabel(show.status)}</Badge>
        <span className="text-xs text-muted">
          Tickets: {done.length} allotted · {remaining.length} remaining
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6">
          <h2 className="mb-1 font-display text-lg font-bold">Manage seats / allotment</h2>
          <p className="mb-4 text-xs text-muted">
            Red = booked but not allotted · Gray = already allotted (done)
          </p>
          {seatsQuery.isLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <SeatMap seats={seats} readonly selected={[]} mode="manage" />
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-ink">Remaining to allot</h3>
              <Badge tone="CANCELLED">{remaining.length}</Badge>
            </div>
            {gateQuery.isLoading && <Skeleton className="h-24" />}
            {!gateQuery.isLoading && remaining.length === 0 && (
              <p className="text-sm text-muted">All booked tickets are allotted.</p>
            )}
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {remaining.map((b) => (
                <div
                  key={b._id}
                  className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{b.bookingNumber}</p>
                      <p className="truncate text-muted">
                        {b.customerName} · {b.mobileNumber}
                      </p>
                      <p className="break-words text-xs text-muted">{seatLabel(b.seats)}</p>
                    </div>
                    <span className="shrink-0 font-bold text-teal">
                      {formatCurrency(b.totalAmount)}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      loading={allotMutation.isPending}
                      disabled={allotMutation.isPending}
                      onClick={() => allotMutation.mutate(b)}
                    >
                      Manual allot
                    </Button>
                    <Link to={`/bookings/${b._id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold">Allotted (done)</h3>
              <Badge tone="CONFIRMED">{done.length}</Badge>
            </div>
            {done.length === 0 && (
              <p className="text-sm text-muted">No tickets allotted yet.</p>
            )}
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {done.map((b) => (
                <Link
                  key={b._id}
                  to={`/bookings/${b._id}`}
                  className="block rounded-xl border border-line px-3 py-2 text-sm hover:border-teal"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{b.bookingNumber}</p>
                      <p className="truncate text-xs text-muted">
                        {b.customerName} · {seatLabel(b.seats)}
                      </p>
                    </div>
                    <Badge tone="CONFIRMED">Done</Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-display text-xl font-bold">All bookings</h2>
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
              <div className="flex flex-wrap items-center gap-2 text-sm sm:gap-3">
                <span className="break-words">{seatLabel(b.seats)}</span>
                <Badge tone={b.bookingStatus}>{b.bookingStatus}</Badge>
                {b.checkInStatus === 'CHECKED_IN' ? (
                  <Badge tone="CONFIRMED">Allotted</Badge>
                ) : b.bookingStatus === 'CONFIRMED' ? (
                  <Badge tone="CANCELLED">Pending</Badge>
                ) : null}
                <span className="font-bold">{formatCurrency(b.totalAmount)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, small }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted sm:text-xs">
        {label}
      </p>
      <p
        className={`mt-1 font-display font-extrabold text-ink ${
          small ? 'text-sm sm:text-base' : 'text-xl sm:text-2xl'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
