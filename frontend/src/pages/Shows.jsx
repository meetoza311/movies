import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { showApi } from '../services/showApi';
import { movieApi } from '../services/movieApi';
import ShowCard from '../components/shows/ShowCard';
import { PageHeader, EmptyState, ErrorState, Skeleton } from '../components/common/States';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { ConfirmDialog } from '../components/common/Modal';

export default function Shows() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [movieId, setMovieId] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);

  const moviesQuery = useQuery({
    queryKey: ['movies', { limit: 100 }],
    queryFn: () => movieApi.list({ limit: 100 }),
  });

  const params = useMemo(
    () => ({
      movieId: movieId || undefined,
      date: date || undefined,
      status: status || undefined,
      page,
      limit: 12,
    }),
    [movieId, date, status, page]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['shows', params],
    queryFn: () => showApi.list(params),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }) => showApi.remove(id, force),
    onSuccess: () => {
      toast.success('Show deleted');
      setPendingDelete(null);
      qc.invalidateQueries({ queryKey: ['shows'] });
    },
    onError: (err) => {
      if (err.errorCode === 'HAS_BOOKINGS') {
        toast.error(err.message);
        return;
      }
      toast.error(err.message);
    },
  });

  return (
    <div>
      <PageHeader
        title="Shows"
        subtitle="Timings across your catalogue"
        actions={
          <Link to="/shows/new">
            <Button>+ Add Show</Button>
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-line bg-surface p-3 shadow-sm sm:mb-5 sm:grid-cols-2 sm:p-4 md:grid-cols-3">
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
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => {
            setPage(1);
            setDate(e.target.value);
          }}
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </div>

      {isLoading && (
        <div className="grid gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      )}
      {error && <ErrorState message={error.message} onRetry={refetch} />}
      {!isLoading && !error && data?.data?.length === 0 && (
        <EmptyState
          title="No shows found"
          description="Schedule a show for one of your movies."
          action={
            <Link to="/shows/new">
              <Button>Add Show</Button>
            </Link>
          }
        />
      )}

      <div className="grid min-w-0 gap-3 sm:gap-4 md:grid-cols-2">
        {(data?.data || []).map((show) => (
          <ShowCard
            key={show._id}
            show={show}
            onEdit={() => navigate(`/shows/${show._id}/edit`)}
            onDelete={() => setPendingDelete(show)}
          />
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
        open={Boolean(pendingDelete)}
        title="Delete show?"
        danger
        loading={deleteMutation.isPending}
        confirmLabel="Delete permanently"
        message="This will remove the show and its seats. If bookings exist, they will also be deleted when you confirm force delete."
        onClose={() => setPendingDelete(null)}
        onConfirm={() =>
          deleteMutation.mutate({ id: pendingDelete._id, force: true })
        }
      />
    </div>
  );
}
