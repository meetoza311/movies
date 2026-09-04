import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { dashboardApi } from '../services/dashboardApi';
import { PageHeader, Skeleton, ErrorState } from '../components/common/States';
import { Select } from '../components/common/Input';
import { formatCurrency, formatDate, formatTime } from '../utils/format';
import { Badge } from '../components/common/Badge';

const PIE_COLORS = ['#16a34a', '#e11d48'];
const CARD_COLORS = [
  'card-color-1',
  'card-color-2',
  'card-color-3',
  'card-color-4',
  'card-color-5',
  'card-color-6',
  'card-color-7',
  'card-color-8',
];

function OccupancyBar({ available, booked, total }) {
  const fill = total > 0 ? Math.round((booked / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] font-semibold">
        <span className="text-success">Available {available}</span>
        <span className="text-teal">Filled {booked}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-line/70">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold to-teal transition-all"
          style={{ width: `${fill}%` }}
        />
      </div>
      <p className="mt-1 text-right text-[11px] font-bold text-muted">{fill}% full</p>
    </div>
  );
}

function StatCard({ label, value, colorClass, to }) {
  const inner = (
    <>
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted sm:text-xs">
        {label}
      </p>
      <p className="mt-1.5 break-words text-xl font-extrabold text-ink sm:mt-2 sm:text-3xl">
        {value}
      </p>
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={`min-w-0 rounded-2xl border p-3 shadow-sm transition hover:border-teal hover:shadow-md sm:p-4 ${colorClass}`}
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={`min-w-0 rounded-2xl border p-3 shadow-sm sm:p-4 ${colorClass}`}>
      {inner}
    </div>
  );
}

export default function Dashboard() {
  const [movieFilter, setMovieFilter] = useState('');
  const [showFilter, setShowFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [
      'dashboard',
      movieFilter || 'all',
      showFilter || 'all',
      statusFilter || 'all',
    ],
    queryFn: () =>
      dashboardApi.stats({
        movieId: movieFilter || undefined,
        showId: showFilter || undefined,
        status: statusFilter || undefined,
      }),
    placeholderData: (prev) => prev,
  });

  const filterOptions = data?.data?.filterOptions || {
    movies: [],
    shows: [],
    statuses: [],
  };
  const movieShows = data?.data?.movieShowOccupancy || [];

  const showOptions = useMemo(() => {
    let list = filterOptions.shows || [];
    // Only narrow shows by selected movie — status must not hide movie/show options
    if (movieFilter) {
      list = list.filter((s) => String(s.movieId) === String(movieFilter));
    }
    return list;
  }, [filterOptions.shows, movieFilter]);

  const filterLabel = useMemo(() => {
    const parts = [];
    if (showFilter) {
      const show = (filterOptions.shows || []).find((s) => String(s.id) === String(showFilter));
      parts.push(show?.label || 'Selected show');
    } else if (movieFilter) {
      const movie = (filterOptions.movies || []).find((m) => String(m.id) === String(movieFilter));
      parts.push(movie?.title || 'Selected movie');
    } else {
      parts.push('All movies');
    }
    if (statusFilter) parts.push(statusFilter);
    else parts.push('all statuses');
    return parts.join(' · ');
  }, [movieFilter, showFilter, statusFilter, filterOptions]);

  if (isLoading && !data) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 sm:h-28" />
        ))}
      </div>
    );
  }

  if (error && !data) {
    return <ErrorState message={error.message} onRetry={refetch} />;
  }

  const cards = data.data.cards;
  const charts = data.data.charts;
  const recent = data.data.recentBookings || [];

  const cardItems = [
    { label: 'Total Movies', value: cards.totalMovies, to: '/movies' },
    { label: 'Upcoming Movies', value: cards.upcomingMovies, to: '/movies' },
    { label: "Today's Shows", value: cards.todaysShows, to: '/shows' },
    { label: 'Total Bookings', value: cards.totalBookings, to: '/bookings' },
    { label: "Today's Bookings", value: cards.todaysBookings, to: '/bookings' },
    { label: 'Total Revenue', value: formatCurrency(cards.totalRevenue) },
    { label: 'Available Seats', value: cards.availableSeats },
    { label: 'Booked Seats', value: cards.bookedSeats },
  ];

  const occupancy = [
    { name: 'Available', value: charts.seatOccupancy.available },
    { name: 'Booked', value: charts.seatOccupancy.booked },
  ];

  return (
    <div className={isFetching ? 'opacity-95' : undefined}>
      <PageHeader
        title="Dashboard"
        subtitle="Savan Sentosa — live cinema overview"
      />

      <div className="mb-4 rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-ink">Filter dashboard</p>
            <p className="text-xs text-muted">
              Applies to cards, shows, revenue, bookings, seats & recent list · {filterLabel}
            </p>
          </div>
          {(movieFilter || showFilter || statusFilter) && (
            <button
              type="button"
              className="text-xs font-bold text-teal"
              onClick={() => {
                setMovieFilter('');
                setShowFilter('');
                setStatusFilter('');
              }}
            >
              Reset to all
            </button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            label="Movie"
            value={movieFilter}
            onChange={(e) => {
              setMovieFilter(e.target.value);
              setShowFilter('');
            }}
          >
            <option value="">All movies</option>
            {(filterOptions.movies || []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </Select>
          <Select
            label="Show status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
            }}
          >
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Select
            label="Show"
            value={showFilter}
            onChange={(e) => {
              const nextShow = e.target.value;
              setShowFilter(nextShow);
              if (nextShow) {
                const match = (filterOptions.shows || []).find(
                  (s) => String(s.id) === String(nextShow)
                );
                if (match?.movieId) setMovieFilter(String(match.movieId));
              }
            }}
          >
            <option value="">All shows</option>
            {showOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        {cardItems.map((card, i) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            to={card.to}
            colorClass={CARD_COLORS[i % CARD_COLORS.length]}
          />
        ))}
      </div>

      <section className="mt-6">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink sm:text-xl">Movies & show seats</h2>
            <p className="text-sm text-muted">
              Scheduled, completed & cancelled — filtered list
            </p>
          </div>
          <Link to="/shows" className="text-sm font-bold text-teal">
            All shows
          </Link>
        </div>

        {movieShows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
            No shows match this filter.
          </div>
        ) : (
          <div className="space-y-4">
            {movieShows.map((movie, idx) => (
              <article
                key={movie.movieId}
                className={`overflow-hidden rounded-2xl border shadow-sm ${CARD_COLORS[idx % CARD_COLORS.length]}`}
              >
                <div className="flex gap-3 border-b border-line/60 p-3 sm:p-4">
                  <div className="h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-ink/5 sm:h-24 sm:w-16">
                    {movie.posterImage ? (
                      <img
                        src={movie.posterImage}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-lg font-bold text-ink/20">
                        {movie.title?.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/movies/${movie.movieId}`}
                      className="truncate text-base font-bold text-ink hover:text-teal sm:text-lg"
                    >
                      {movie.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted sm:text-sm">
                      {movie.shows.length} show(s)
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
                  {movie.shows.map((show) => (
                    <Link
                      key={show._id}
                      to={`/shows/${show._id}`}
                      className="rounded-2xl border border-line bg-surface p-3 shadow-sm transition hover:border-teal hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-ink">
                            {formatDate(show.showDate)}
                          </p>
                          <p className="text-lg font-extrabold text-teal">
                            {formatTime(show.startTime)}
                          </p>
                          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                            {show.status || 'scheduled'}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-gold">
                          G {formatCurrency(show.guestPrice ?? show.seatPrice)} · O{' '}
                          {formatCurrency(show.ownerPrice ?? 50)}
                        </p>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-lg bg-paper px-1 py-2">
                          <p className="font-bold text-ink">{show.seats.total}</p>
                          <p className="text-muted">Total</p>
                        </div>
                        <div className="rounded-lg bg-success/10 px-1 py-2">
                          <p className="font-bold text-success">{show.seats.available}</p>
                          <p className="text-muted">Free</p>
                        </div>
                        <div className="rounded-lg bg-teal/10 px-1 py-2">
                          <p className="font-bold text-teal">{show.seats.booked}</p>
                          <p className="text-muted">Filled</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <OccupancyBar
                          available={show.seats.available}
                          booked={show.seats.booked}
                          total={show.seats.total}
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="mt-6 grid min-w-0 gap-4 xl:grid-cols-2">
        <div className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <h2 className="text-lg font-bold">Bookings (7 days)</h2>
          <p className="text-xs text-muted">{filterLabel}</p>
          <div className="mt-4 h-56 min-w-0 overflow-hidden sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.bookingsByDay}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#e11d48" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <h2 className="text-lg font-bold">Revenue (7 days)</h2>
          <p className="text-xs text-muted">{filterLabel}</p>
          <div className="mt-4 h-56 min-w-0 overflow-hidden sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.revenueByDay}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <h2 className="text-lg font-bold">Seat occupancy</h2>
          <p className="text-xs text-muted">{filterLabel}</p>
          <div className="mt-4 h-56 min-w-0 overflow-hidden sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={occupancy} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {occupancy.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <h2 className="text-lg font-bold">Top movies</h2>
          <p className="text-xs text-muted">{filterLabel}</p>
          <div className="mt-4 space-y-3">
            {(charts.moviePerformance || []).length === 0 && (
              <p className="text-sm text-muted">No confirmed bookings for this filter.</p>
            )}
            {(charts.moviePerformance || []).map((m) => (
              <Link
                key={m.movieId}
                to={`/movies/${m.movieId}`}
                className="flex items-center justify-between rounded-xl bg-paper px-3 py-2 transition hover:bg-paper/80"
              >
                <div>
                  <p className="font-semibold text-ink">{m.title || 'Unknown'}</p>
                  <p className="text-xs text-muted">
                    {m.bookings} bookings · {m.seats} seats
                  </p>
                </div>
                <p className="font-bold text-teal">{formatCurrency(m.revenue)}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Recent bookings</h2>
            <p className="text-xs text-muted">{filterLabel}</p>
          </div>
          <Link to="/bookings" className="text-sm font-bold text-teal">
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {recent.length === 0 && (
            <p className="text-sm text-muted">No bookings for this filter.</p>
          )}
          {recent.map((b) => (
            <Link
              key={b._id}
              to={`/bookings/${b._id}`}
              className="flex flex-col gap-2 rounded-xl border border-line bg-paper/50 px-3 py-3 transition hover:border-teal sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-ink">{b.bookingNumber}</p>
                <p className="text-sm text-muted">
                  {b.movieId?.title} · {b.customerName}
                  {b.blockNo ? ` · Block ${b.blockNo}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted">
                  {formatDate(b.showId?.showDate)} {formatTime(b.showId?.startTime)}
                </span>
                <Badge tone={b.bookingStatus}>{b.bookingStatus}</Badge>
                <span className="font-bold text-ink">{formatCurrency(b.totalAmount)}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
