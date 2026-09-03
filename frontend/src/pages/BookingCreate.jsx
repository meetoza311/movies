import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { movieApi } from '../services/movieApi';
import { showApi } from '../services/showApi';
import { bookingApi } from '../services/bookingApi';
import SeatMap from '../components/seats/SeatMap';
import TicketView from '../components/bookings/TicketView';
import { PageHeader, Skeleton } from '../components/common/States';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { formatCurrency, formatDate, formatTime } from '../utils/format';

const STEPS = [
  'Movie',
  'Date',
  'Show',
  'Seats',
  'Customer',
  'Review',
];

export default function BookingCreate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState(0);
  const [movieId, setMovieId] = useState(searchParams.get('movieId') || '');
  const [date, setDate] = useState('');
  const [showId, setShowId] = useState(searchParams.get('showId') || '');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [ticket, setTicket] = useState(null);

  const moviesQuery = useQuery({
    queryKey: ['movies', { limit: 100, status: 'now_showing' }],
    queryFn: () => movieApi.list({ limit: 100 }),
  });

  const showsQuery = useQuery({
    queryKey: ['shows', { movieId, date, status: 'scheduled' }],
    queryFn: () =>
      showApi.list({
        movieId,
        date: date || undefined,
        status: 'scheduled',
        limit: 50,
      }),
    enabled: Boolean(movieId),
  });

  const seatsQuery = useQuery({
    queryKey: ['seats', showId],
    queryFn: () => showApi.seats(showId),
    enabled: Boolean(showId),
  });

  useEffect(() => {
    if (searchParams.get('showId')) {
      setStep(3);
    } else if (searchParams.get('movieId')) {
      setStep(1);
    }
  }, [searchParams]);

  const selectedShow = useMemo(
    () => (showsQuery.data?.data || []).find((s) => s._id === showId),
    [showsQuery.data, showId]
  );

  const selectedMovie = useMemo(
    () => (moviesQuery.data?.data || []).find((m) => m._id === movieId),
    [moviesQuery.data, movieId]
  );

  const seatPrice = selectedShow?.seatPrice ?? seatsQuery.data?.data?.show?.seatPrice ?? 0;
  const total = seatPrice * selectedSeats.length;

  const mutation = useMutation({
    mutationFn: () =>
      bookingApi.create({
        showId,
        customerName,
        mobileNumber,
        seats: selectedSeats,
      }),
    onSuccess: (res) => {
      toast.success('Booking confirmed');
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['seats', showId] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setTicket(res.data);
    },
    onError: (err) => {
      toast.error(err.message);
      if (err.errorCode === 'SEAT_ALREADY_BOOKED') {
        seatsQuery.refetch();
        setSelectedSeats([]);
        setStep(3);
      }
    },
  });

  function toggleSeat(seatNumber) {
    const next = String(seatNumber).toUpperCase().trim();
    setSelectedSeats((prev) =>
      prev.includes(next)
        ? prev.filter((s) => s !== next)
        : [...prev, next]
    );
  }

  function canNext() {
    if (step === 0) return Boolean(movieId);
    if (step === 1) return Boolean(date);
    if (step === 2) return Boolean(showId);
    if (step === 3) return selectedSeats.length > 0;
    if (step === 4) {
      return (
        customerName.trim().length >= 2 &&
        /^[6-9]\d{9}$/.test(mobileNumber.trim())
      );
    }
    return true;
  }

  function handleNext() {
    if (!canNext()) {
      toast.error('Please complete this step');
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Create Booking"
        subtitle={step === 3 ? undefined : 'Walk-up ticket from the admin desk'}
        className={step === 3 ? '!mb-2 sm:!mb-6' : undefined}
      />

      <div
        className={`mb-4 flex gap-1.5 overflow-x-auto pb-1 sm:mb-6 sm:flex-wrap sm:overflow-visible ${
          step === 3 ? 'hidden sm:flex' : ''
        }`}
      >
        {STEPS.map((label, index) => (
          <div
            key={label}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold sm:px-3 sm:text-xs ${
              index === step
                ? 'bg-teal text-white'
                : index < step
                  ? 'bg-gold-soft text-warn'
                  : 'bg-line text-muted'
            }`}
          >
            {index + 1}. {label}
          </div>
        ))}
      </div>

      {step === 3 && (
        <p className="mb-3 text-center text-sm font-semibold text-ink sm:hidden">
          Tap seats to select
        </p>
      )}

      <div
        className={`rounded-2xl border border-line bg-surface shadow-sm ${
          step === 3 ? 'p-3 sm:p-5' : 'p-5'
        }`}
      >        {step === 0 && (
          <Select
            label="Select Movie"
            value={movieId}
            onChange={(e) => {
              setMovieId(e.target.value);
              setShowId('');
              setSelectedSeats([]);
              setDate('');
            }}
          >
            <option value="">Choose a movie</option>
            {(moviesQuery.data?.data || []).map((m) => (
              <option key={m._id} value={m._id}>
                {m.title}
              </option>
            ))}
          </Select>
        )}

        {step === 1 && (
          <Input
            label="Select Date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setShowId('');
              setSelectedSeats([]);
            }}
          />
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted">Select a show for {formatDate(date)}</p>
            {showsQuery.isLoading && <Skeleton className="h-24" />}
            {(showsQuery.data?.data || []).length === 0 && !showsQuery.isLoading && (
              <p className="text-sm text-muted">No shows for this date.</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {(showsQuery.data?.data || []).map((show) => (
                <button
                  key={show._id}
                  type="button"
                  onClick={() => {
                    setShowId(show._id);
                    setSelectedSeats([]);
                  }}
                  className={`rounded-xl border p-4 text-left transition ${
                    showId === show._id
                      ? 'border-teal bg-teal/5'
                      : 'border-line hover:border-teal'
                  }`}
                >
                  <p className="font-display text-lg font-bold">
                    {formatTime(show.startTime)}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Available {show.seats?.available ?? '—'} / {show.seats?.total ?? show.totalSeats}
                  </p>
                  <p className="mt-1 font-semibold text-teal">
                    {formatCurrency(show.seatPrice)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            {seatsQuery.isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <SeatMap
                seats={seatsQuery.data?.data?.seats || []}
                selected={selectedSeats}
                onToggle={toggleSeat}
              />
            )}
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-paper px-3 py-2.5 text-xs sm:mt-4 sm:px-4 sm:py-3 sm:text-sm">
              <div className="min-w-0">
                <p className="truncate">
                  <span className="text-muted">Seats </span>
                  <strong>{selectedSeats.join(', ') || 'None'}</strong>
                </p>
                <p className="text-muted sm:hidden">
                  {selectedSeats.length} × {formatCurrency(seatPrice)}
                </p>
              </div>
              <p className="shrink-0 font-display text-lg font-extrabold text-teal sm:text-xl">
                {formatCurrency(total)}
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
              minLength={2}
            />
            <Input
              label="Mobile number"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="10-digit Indian mobile"
              required
            />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3 text-sm">
            <SummaryRow label="Movie" value={selectedMovie?.title} />
            <SummaryRow label="Date" value={formatDate(selectedShow?.showDate || date)} />
            <SummaryRow label="Time" value={formatTime(selectedShow?.startTime)} />
            <SummaryRow label="Seats" value={selectedSeats.join(', ')} />
            <SummaryRow label="Seat price" value={formatCurrency(seatPrice)} />
            <SummaryRow label="Quantity" value={selectedSeats.length} />
            <SummaryRow label="Customer" value={customerName} />
            <SummaryRow label="Mobile" value={mobileNumber} />
            <div className="rounded-xl bg-paper px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Total</p>
              <p className="font-display text-3xl font-extrabold text-teal">
                {formatCurrency(total)}
              </p>
              <p className="mt-1 text-xs text-muted">
                Final amount is recalculated securely on the server.
              </p>
            </div>
          </div>
        )}

        <div className={`mt-5 flex flex-wrap justify-between gap-2 sm:mt-6 ${step === 3 ? 'pb-1' : 'pb-2'}`}>
          <Button
            type="button"
            variant="outline"
            disabled={step === 0 || mutation.isPending}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={handleNext} className="min-w-28">
              {step === 3 ? `Continue${selectedSeats.length ? ` (${selectedSeats.length})` : ''}` : 'Continue'}
            </Button>
          ) : (
            <Button
              type="button"
              loading={mutation.isPending}
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Confirm Booking
            </Button>
          )}
        </div>
      </div>

      {ticket && (
        <TicketView
          booking={ticket}
          onClose={() => {
            setTicket(null);
            navigate(`/bookings/${ticket._id}`);
          }}
        />
      )}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-line py-2">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink">{value || '—'}</span>
    </div>
  );
}
