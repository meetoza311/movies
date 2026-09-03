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

export default function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.stats(),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 sm:h-28" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error.message} onRetry={refetch} />;
  }

  const cards = data.data.cards;
  const charts = data.data.charts;
  const recent = data.data.recentBookings || [];
  const movieShows = data.data.movieShowOccupancy || [];

  const cardItems = [
    { label: 'Total Movies', value: cards.totalMovies },
    { label: 'Upcoming Movies', value: cards.upcomingMovies },
    { label: "Today's Shows", value: cards.todaysShows },
    { label: 'Total Bookings', value: cards.totalBookings },
    { label: "Today's Bookings", value: cards.todaysBookings },
    { label: 'Total Revenue', value: formatCurrency(cards.totalRevenue) },
    { label: 'Available Seats', value: cards.availableSeats },
    { label: 'Booked Seats', value: cards.bookedSeats },
  ];

  const occupancy = [
    { name: 'Available', value: charts.seatOccupancy.available },
    { name: 'Booked', value: charts.seatOccupancy.booked },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Savan Sentosa — live cinema overview" />

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
        {cardItems.map((card, i) => (
          <div
            key={card.label}
            className={`rounded-2xl border p-3 shadow-sm sm:p-4 ${CARD_COLORS[i % CARD_COLORS.length]}`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted sm:text-xs">
              {card.label}
            </p>
            <p className="mt-1.5 text-xl font-extrabold text-ink sm:mt-2 sm:text-3xl">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Movie-wise shows with seat availability */}
      <section className="mt-6">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-ink sm:text-xl">Movies & show seats</h2>
            <p className="text-sm text-muted">Next 7 days — available vs filled seats</p>
          </div>
          <Link to="/shows" className="text-sm font-bold text-teal">
            All shows
          </Link>
        </div>

        {movieShows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-8 text-center text-sm text-muted">
            No upcoming shows in the next 7 days.
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
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/movies/${movie.movieId}`}
                        className="truncate text-base font-bold text-ink hover:text-teal sm:text-lg"
                      >
                        {movie.title}
                      </Link>
                    </div>
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

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <h2 className="text-lg font-bold">Bookings (7 days)</h2>
          <div className="mt-4 h-56 sm:h-64">
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

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <h2 className="text-lg font-bold">Revenue (7 days)</h2>
          <div className="mt-4 h-56 sm:h-64">
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

        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <h2 className="text-lg font-bold">Seat occupancy</h2>
          <div className="mt-4 h-56 sm:h-64">
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
          <div className="mt-4 space-y-3">
            {(charts.moviePerformance || []).length === 0 && (
              <p className="text-sm text-muted">No confirmed bookings yet.</p>
            )}
            {(charts.moviePerformance || []).map((m) => (
              <div
                key={m.movieId}
                className="flex items-center justify-between rounded-xl bg-paper px-3 py-2"
              >
                <div>
                  <p className="font-semibold text-ink">{m.title || 'Unknown'}</p>
                  <p className="text-xs text-muted">
                    {m.bookings} bookings · {m.seats} seats
                  </p>
                </div>
                <p className="font-bold text-teal">{formatCurrency(m.revenue)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Recent bookings</h2>
          <Link to="/bookings" className="text-sm font-bold text-teal">
            View all
          </Link>
        </div>
        <div className="space-y-2">
          {recent.length === 0 && <p className="text-sm text-muted">No bookings yet.</p>}
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
