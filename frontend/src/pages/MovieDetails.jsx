import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { movieApi } from '../services/movieApi';
import { showApi } from '../services/showApi';
import { PageHeader, Skeleton, ErrorState, EmptyState } from '../components/common/States';
import { Button } from '../components/common/Button';
import { formatCurrency, formatDate, formatTime } from '../utils/format';

export default function MovieDetails() {
  const { id } = useParams();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['movie', id],
    queryFn: () => movieApi.get(id),
  });

  const showsQuery = useQuery({
    queryKey: ['shows', { movieId: id }],
    queryFn: () => showApi.list({ movieId: id, limit: 50 }),
    enabled: Boolean(id),
  });

  if (isLoading) return <Skeleton className="h-96" />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const movie = data.data;
  const shows = showsQuery.data?.data || [];

  const grouped = shows.reduce((acc, show) => {
    const key = formatDate(show.showDate);
    if (!acc[key]) acc[key] = [];
    acc[key].push(show);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title={movie.title}
        subtitle="Movie details and scheduled shows"
        actions={
          <>
            <Link to={`/movies/${movie._id}/edit`} className="min-w-0 flex-1 sm:flex-none">
              <Button variant="outline" className="w-full">
                Edit
              </Button>
            </Link>
            <Link to={`/shows/new?movieId=${movie._id}`} className="min-w-0 flex-1 sm:flex-none">
              <Button className="w-full">Add Show</Button>
            </Link>
          </>
        }
      />

      <div className="grid min-w-0 gap-6 lg:grid-cols-[280px_1fr]">
        <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          {movie.posterImage ? (
            <img src={movie.posterImage} alt="" className="aspect-[2/3] w-full object-cover" />
          ) : (
            <div className="flex aspect-[2/3] items-center justify-center bg-ink/5 text-5xl font-bold text-ink/20">
              {movie.title.slice(0, 1)}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
            <p className="text-sm leading-relaxed text-ink/80">
              {movie.description || 'No description.'}
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-xl font-bold">Shows</h2>
            {showsQuery.isLoading && <Skeleton className="h-40" />}
            {!showsQuery.isLoading && shows.length === 0 && (
              <EmptyState
                title="No shows scheduled"
                description="Create a show timing for this movie."
                action={
                  <Link to={`/shows/new?movieId=${movie._id}`}>
                    <Button>Add Show</Button>
                  </Link>
                }
              />
            )}
            <div className="space-y-5">
              {Object.entries(grouped).map(([date, dayShows]) => (
                <div key={date}>
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
                    {date}
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {dayShows.map((show) => (
                      <Link
                        key={show._id}
                        to={`/shows/${show._id}`}
                        className="rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:border-teal"
                      >
                        <p className="text-lg font-bold">{formatTime(show.startTime)}</p>
                        <p className="mt-2 text-sm text-muted">
                          Seats: {show.seats?.total ?? show.totalSeats} · Available:{' '}
                          {show.seats?.available ?? '—'} · Filled: {show.seats?.booked ?? '—'}
                        </p>
                        <p className="mt-1 font-semibold text-teal">
                          Guest {formatCurrency(show.guestPrice ?? show.seatPrice ?? 80)} · Owner{' '}
                          {formatCurrency(show.ownerPrice ?? 50)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
