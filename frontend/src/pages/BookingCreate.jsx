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
  const [seatCategory, setSeatCategory] = useState('GUEST');
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
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

  const showPrices = useMemo(() => {
    const show = selectedShow || seatsQuery.data?.data?.show || {};
    return {
      guestPrice: Number(show.guestPrice ?? show.seatPrice ?? 80),
      ownerPrice: Number(show.ownerPrice ?? 50),
    };
  }, [selectedShow, seatsQuery.data]);

  const total = useMemo(
    () =>
      selectedSeats.reduce(
        (sum, s) =>
          sum +
          (s.category === 'OWNER' ? showPrices.ownerPrice : showPrices.guestPrice),
        0
      ),
    [selectedSeats, showPrices]
  );

  const guestCount = selectedSeats.filter((s) => s.category === 'GUEST').length;
  const ownerCount = selectedSeats.filter((s) => s.category === 'OWNER').length;

  const mutation = useMutation({
    mutationFn: () =>
      bookingApi.create({
        showId,
        customerName,
        mobileNumber,
        customerEmail,
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
    setSelectedSeats((prev) => {
      const exists = prev.find((s) => s.seatNumber === next);
      if (exists) return prev.filter((s) => s.seatNumber !== next);
      return [...prev, { seatNumber: next, category: seatCategory }];
    });
  }

  function canNext() {
    if (step === 0) return Boolean(movieId);
    if (step === 1) return Boolean(date);
    if (step === 2) return Boolean(showId);
    if (step === 3) return selectedSeats.length > 0;
    if (step === 4) {
      return (
        customerName.trim().length >= 2 &&
        /^[6-9]\d{9}$/.test(mobileNumber.trim()) &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())
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
    <div className="mx-auto min-w-0 max-w-4xl">
      <PageHeader
        title="Create Booking"
        subtitle={step === 3 ? undefined : 'Walk-up ticket from the admin desk'}
        className={step === 3 ? '!mb-2 sm:!mb-6' : undefined}
      />

      <div
        className={`mb-4 flex gap-1.5 overflow-x-auto overflow-y-hidden pb-1 sm:mb-6 sm:flex-wrap sm:overflow-visible ${
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
      >
        {step === 0 && (
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
                    Guest {formatCurrency(show.guestPrice ?? show.seatPrice ?? 80)} · Owner{' '}
                    {formatCurrency(show.ownerPrice ?? 50)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <Select
                label="Assign seats as"
                value={seatCategory}
                onChange={(e) => setSeatCategory(e.target.value)}
              >
                <option value="GUEST">
                  Guest — {formatCurrency(showPrices.guestPrice)}
                </option>
                <option value="OWNER">
                  Owner — {formatCurrency(showPrices.ownerPrice)}
                </option>
              </Select>
              <div className="rounded-xl bg-paper px-3 py-2 text-xs text-muted sm:self-end sm:py-3">
                Tap seats to assign as <strong>{seatCategory === 'OWNER' ? 'Owner' : 'Guest'}</strong>.
                Change the dropdown anytime — no seat limit per type.
              </div>
            </div>
            {seatsQuery.isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <SeatMap
                seats={seatsQuery.data?.data?.seats || []}
                selected={selectedSeats}
                activeCategory={seatCategory}
                onToggle={toggleSeat}
                mode="book"
              />
            )}
            <div className="mt-3 flex items-start justify-between gap-2 rounded-xl bg-paper px-3 py-2.5 text-xs sm:mt-4 sm:px-4 sm:py-3 sm:text-sm">
              <div className="min-w-0">
                <p className="break-words">
                  <span className="text-muted">Seats </span>
                  <strong>
                    {selectedSeats.length
                      ? selectedSeats
                          .map((s) => `${s.seatNumber}(${s.category === 'OWNER' ? 'O' : 'G'})`)
                          .join(', ')
                      : 'None'}
                  </strong>
                </p>
                <p className="text-muted">
                  Guest {guestCount} × {formatCurrency(showPrices.guestPrice)} · Owner{' '}
                  {ownerCount} × {formatCurrency(showPrices.ownerPrice)}
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
            <div className="sm:col-span-2">
              <Input
                label="Email"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@email.com"
                required
              />
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3 text-sm">
            <SummaryRow label="Movie" value={selectedMovie?.title} />
            <SummaryRow label="Date" value={formatDate(selectedShow?.showDate || date)} />
            <SummaryRow label="Time" value={formatTime(selectedShow?.startTime)} />
            <SummaryRow
              label="Seats"
              value={selectedSeats
                .map((s) => `${s.seatNumber} (${s.category === 'OWNER' ? 'Owner' : 'Guest'})`)
                .join(', ')}
            />
            <SummaryRow
              label="Guest seats"
              value={`${guestCount} × ${formatCurrency(showPrices.guestPrice)}`}
            />
            <SummaryRow
              label="Owner seats"
              value={`${ownerCount} × ${formatCurrency(showPrices.ownerPrice)}`}
            />
            <SummaryRow label="Quantity" value={selectedSeats.length} />
            <SummaryRow label="Customer" value={customerName} />
            <SummaryRow label="Mobile" value={mobileNumber} />
            <SummaryRow label="Email" value={customerEmail} />
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

        <div
          className={`mt-5 flex gap-2 sm:mt-6 ${
            step === 3
              ? 'sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-10 -mx-3 border-t border-line bg-surface/95 px-3 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none'
              : ''
          }`}
        >
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            disabled={step === 0 || mutation.isPending}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={handleNext} className="min-w-28 flex-1 sm:flex-none">
              {step === 3
                ? `Continue${selectedSeats.length ? ` (${selectedSeats.length})` : ''}`
                : 'Continue'}
            </Button>
          ) : (
            <Button
              type="button"
              className="flex-1 sm:flex-none"
              loading={mutation.isPending}
              disabled={mutation.isPending}
              onClick={() => {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
                  toast.error('Email is required to confirm booking');
                  setStep(4);
                  return;
                }
                mutation.mutate();
              }}
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
            const nextShowId = ticket.showId?._id || ticket.showId || showId;
            const nextMovieId = ticket.movieId?._id || ticket.movieId || movieId;
            setTicket(null);
            setSelectedSeats([]);
            setCustomerName('');
            setMobileNumber('');
            setCustomerEmail('');
            setSeatCategory('GUEST');
            setShowId(String(nextShowId || ''));
            setMovieId(String(nextMovieId || ''));
            setStep(3);
            seatsQuery.refetch();
            const params = new URLSearchParams();
            if (nextShowId) params.set('showId', String(nextShowId));
            if (nextMovieId) params.set('movieId', String(nextMovieId));
            navigate(`/bookings/new?${params.toString()}`, { replace: true });
          }}
        />
      )}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dashed border-line py-2">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="break-words text-right font-semibold text-ink">{value || '—'}</span>
    </div>
  );
}
