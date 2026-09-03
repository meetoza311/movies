import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { bookingApi } from '../services/bookingApi';
import { movieApi } from '../services/movieApi';
import { PageHeader, EmptyState, ErrorState, Skeleton } from '../components/common/States';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/Modal';
import { formatCurrency, formatDate, formatTime } from '../utils/format';

export default function Bookings() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [movieId, setMovieId] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const moviesQuery = useQuery({
    queryKey: ['movies', { limit: 100 }],
    queryFn: () => movieApi.list({ limit: 100 }),
  });

  const params = useMemo(
    () => ({
      search: search || undefined,
      status: status || undefined,
      movieId: movieId || undefined,
      date: date || undefined,
      page,
      limit: 15,
    }),
    [search, status, movieId, date, page]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['bookings', params],
    queryFn: () => bookingApi.list(params),
  });

  const cancelMutation = useMutation({
    mutationFn: (id) => bookingApi.cancel(id),
    onSuccess: () => {
      toast.success('Booking cancelled');
      setCancelTarget(null);
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => bookingApi.remove(id),
    onSuccess: () => {
      toast.success('Booking permanently deleted');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle="Tickets created from the admin desk"
        actions={
          <Link to="/bookings/new">
            <Button>+ Create Booking</Button>
          </Link>
        }
      />

      <div className="mb-4 space-y-3 rounded-2xl border border-line bg-surface p-3 shadow-sm sm:mb-5 sm:p-4 md:grid md:grid-cols-4 md:gap-3 md:space-y-0">
        <Input
          label="Search"
          placeholder="Booking # / name / mobile"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <div className="grid grid-cols-2 gap-3 md:contents">
          <Select
            label="Status"
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">All</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
          <Input
            label="Date"
            type="date"
            value={date}
            onChange={(e) => {
              setPage(1);
              setDate(e.target.value);
            }}
          />
        </div>
        <Select
          label="Movie"
          value={movieId}
          onChange={(e) => {
            setPage(1);
            setMovieId(e.target.value);
          }}
        >
          <option value="">All movies</option>
          {(moviesQuery.data?.data || []).map((m) => (
            <option key={m._id} value={m._id}>
              {m.title}
            </option>
          ))}
        </Select>
      </div>

      {isLoading && <Skeleton className="h-64" />}
      {error && <ErrorState message={error.message} onRetry={refetch} />}
      {!isLoading && !error && data?.data?.length === 0 && (
        <EmptyState
          title="No bookings found"
          description="Create a walk-up booking for a customer."
          action={
            <Link to="/bookings/new">
              <Button>Create Booking</Button>
            </Link>
          }
        />
      )}

      <div className="hidden overflow-x-auto overflow-y-hidden rounded-2xl border border-line bg-surface shadow-sm md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-paper text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Movie</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Seats</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.data || []).map((b) => (
              <tr key={b._id} className="border-t border-line">
                <td className="px-4 py-3 font-semibold">{b.bookingNumber}</td>
                <td className="px-4 py-3">
                  <div>{b.movieId?.title}</div>
                  <div className="text-xs text-muted">
                    {formatDate(b.showId?.showDate)} {formatTime(b.showId?.startTime)}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>{b.customerName}</div>
                  <div className="text-xs text-muted">{b.mobileNumber}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="break-words">
                    {(b.seats || [])
                      .map((s) => {
                        const cat =
                          String(s.category || 'GUEST').toUpperCase() === 'OWNER'
                            ? 'O'
                            : 'G';
                        return `${s.seatNumber}(${cat})`;
                      })
                      .join(', ')}
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold">{formatCurrency(b.totalAmount)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <Badge tone={b.bookingStatus}>{b.bookingStatus}</Badge>
                    {b.checkInStatus === 'CHECKED_IN' && (
                      <Badge tone="CONFIRMED">Allotted</Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/bookings/${b._id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                    {b.bookingStatus === 'CONFIRMED' && (
                      <Button size="sm" variant="ghost" onClick={() => setCancelTarget(b)}>
                        Cancel
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(b)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {(data?.data || []).map((b) => (
          <div key={b._id} className="rounded-2xl border border-line bg-surface p-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{b.bookingNumber}</p>
                <p className="truncate text-sm text-muted">{b.movieId?.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {formatDate(b.showId?.showDate)} · {formatTime(b.showId?.startTime)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge tone={b.bookingStatus}>{b.bookingStatus}</Badge>
                {b.checkInStatus === 'CHECKED_IN' && (
                  <Badge tone="CONFIRMED">Allotted</Badge>
                )}
              </div>
            </div>
            <p className="mt-2 text-sm">
              {b.customerName} · {b.mobileNumber}
            </p>
            <p className="break-words text-sm text-muted">
              {(b.seats || [])
                .map((s) => {
                  const cat =
                    String(s.category || 'GUEST').toUpperCase() === 'OWNER' ? 'Owner' : 'Guest';
                  return `${s.seatNumber} (${cat})`;
                })
                .join(', ')}
            </p>
            <p className="mt-1 font-bold text-teal">{formatCurrency(b.totalAmount)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/bookings/${b._id}`} className="flex-1">
                <Button size="sm" variant="outline" className="w-full">
                  View
                </Button>
              </Link>
              {b.bookingStatus === 'CONFIRMED' && (
                <Button size="sm" variant="ghost" onClick={() => setCancelTarget(b)}>
                  Cancel
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(b)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {data?.pagination?.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= data.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel Booking"
        confirmLabel="Cancel Booking"
        danger
        loading={cancelMutation.isPending}
        message="This will mark the booking as CANCELLED and release its seats."
        onClose={() => setCancelTarget(null)}
        onConfirm={() => cancelMutation.mutate(cancelTarget._id)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Permanently"
        confirmLabel="Delete Permanently"
        danger
        loading={deleteMutation.isPending}
        message="This permanently removes the booking record. Prefer Cancel Booking when you only need to free seats."
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget._id)}
      />
    </div>
  );
}
