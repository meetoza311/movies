import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { movieApi } from '../services/movieApi';
import MovieCard from '../components/movies/MovieCard';
import { PageHeader, EmptyState, ErrorState, Skeleton } from '../components/common/States';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { ConfirmDialog } from '../components/common/Modal';

export default function Movies() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deps, setDeps] = useState(null);

  const params = useMemo(
    () => ({
      search: search || undefined,
      sort,
      page,
      limit: 12,
    }),
    [search, sort, page]
  );

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['movies', params],
    queryFn: () => movieApi.list(params),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => movieApi.remove(id),
    onSuccess: () => {
      toast.success('Movie deleted');
      setPendingDelete(null);
      setDeps(null);
      qc.invalidateQueries({ queryKey: ['movies'] });
    },
    onError: (err) => toast.error(err.message),
  });

  async function askDelete(movie) {
    try {
      const res = await movieApi.dependencies(movie._id);
      setDeps(res.data);
      setPendingDelete(movie);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Movies"
        subtitle="Catalogue of titles on the desk"
        actions={
          <Link to="/movies/new">
            <Button>+ Add Movie</Button>
          </Link>
        }
      />

      <div className="mb-4 grid gap-3 rounded-2xl border border-line bg-surface p-3 shadow-sm sm:mb-5 sm:grid-cols-2 sm:p-4">
        <Input
          label="Search"
          placeholder="Search by movie name"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <Select
          label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </Select>
      </div>

      {isLoading && (
        <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-72 sm:h-96" />
          ))}
        </div>
      )}

      {error && <ErrorState message={error.message} onRetry={refetch} />}

      {!isLoading && !error && data?.data?.length === 0 && (
        <EmptyState
          title="No movies yet"
          description="Add your first title to start scheduling shows."
          action={
            <Link to="/movies/new">
              <Button>Add Movie</Button>
            </Link>
          }
        />
      )}

      <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {(data?.data || []).map((movie) => (
          <MovieCard
            key={movie._id}
            movie={movie}
            onEdit={() => navigate(`/movies/${movie._id}/edit`)}
            onDelete={askDelete}
          />
        ))}
      </div>

      {data?.pagination?.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
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
        title="Delete movie?"
        danger
        loading={deleteMutation.isPending}
        confirmLabel="Delete Movie"
        message={
          pendingDelete
            ? `This movie has ${deps?.shows ?? 0} shows and ${deps?.bookings ?? 0} bookings.\n\nDeleting this movie will also delete:\n- Shows\n- Seats\n- Bookings\n\nThis action cannot be undone.`
            : ''
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={() => deleteMutation.mutate(pendingDelete._id)}
      />
    </div>
  );
}
