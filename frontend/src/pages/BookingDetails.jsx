import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { bookingApi } from '../services/bookingApi';
import { showApi } from '../services/showApi';
import SeatMap from '../components/seats/SeatMap';
import TicketView from '../components/bookings/TicketView';
import { PageHeader, Skeleton, ErrorState } from '../components/common/States';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { ConfirmDialog } from '../components/common/Modal';
import { formatCurrency, formatDate, formatTime } from '../utils/format';

function seatLabel(s) {
  const cat = String(s.category || 'GUEST').toUpperCase();
  return `${s.seatNumber} (${cat === 'OWNER' ? 'Owner' : 'Guest'})`;
}

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatCategory, setSeatCategory] = useState('GUEST');
  const [showTicket, setShowTicket] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingApi.get(id),
  });

  const booking = data?.data;
  const showId = booking?.showId?._id || booking?.showId;

  const seatsQuery = useQuery({
    queryKey: ['seats', showId],
    queryFn: () => showApi.seats(showId),
    enabled: Boolean(showId),
  });

  useEffect(() => {
    if (booking) {
      setCustomerName(booking.customerName);
      setMobileNumber(booking.mobileNumber);
      setCustomerEmail(booking.customerEmail || '');
      setSelectedSeats(
        (booking.seats || []).map((s) => ({
          seatNumber: String(s.seatNumber).toUpperCase().trim(),
          category: String(s.category || 'GUEST').toUpperCase(),
        }))
      );
    }
  }, [booking]);

  const updateMutation = useMutation({
    mutationFn: (payload) => bookingApi.update(id, payload),
    onSuccess: () => {
      toast.success('Booking updated');
      setEditing(false);
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['seats', showId] });
    },
    onError: (err) => toast.error(err.message),
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingApi.cancel(id),
    onSuccess: () => {
      toast.success('Booking cancelled');
      setCancelOpen(false);
      qc.invalidateQueries({ queryKey: ['booking', id] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['seats', showId] });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: () => bookingApi.remove(id),
    onSuccess: () => {
      toast.success('Booking deleted');
      navigate('/bookings');
    },
    onError: (err) => toast.error(err.message),
  });

  const show = booking?.showId;
  const prices = useMemo(() => {
    const guest = Number(
      booking?.guestPrice ?? show?.guestPrice ?? show?.seatPrice ?? booking?.seatPrice ?? 80
    );
    const owner = Number(booking?.ownerPrice ?? show?.ownerPrice ?? 50);
    return { guestPrice: guest, ownerPrice: owner };
  }, [booking, show]);

  const liveTotal = useMemo(
    () =>
      selectedSeats.reduce(
        (sum, s) =>
          sum + (s.category === 'OWNER' ? prices.ownerPrice : prices.guestPrice),
        0
      ),
    [selectedSeats, prices]
  );

  const mySeatNumbers = useMemo(
    () => (booking?.seats || []).map((s) => String(s.seatNumber).toUpperCase().trim()),
    [booking]
  );

  if (isLoading) return <Skeleton className="h-96" />;
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const movie = booking.movieId;

  function toggleSeat(seatNumber) {
    const next = String(seatNumber).toUpperCase().trim();
    setSelectedSeats((prev) => {
      const exists = prev.find((s) => s.seatNumber === next);
      if (exists) return prev.filter((s) => s.seatNumber !== next);
      return [...prev, { seatNumber: next, category: seatCategory }];
    });
  }

  const editableSeats = (seatsQuery.data?.data?.seats || []).map((seat) => {
    const seatNumber = String(seat.seatNumber).toUpperCase().trim();
    const isMine =
      String(seat.bookingId) === String(booking._id) ||
      selectedSeats.some((s) => s.seatNumber === seatNumber);

    if (seat.status === 'BOOKED' && isMine) {
      return { ...seat, seatNumber, status: 'AVAILABLE', category: undefined };
    }
    return { ...seat, seatNumber };
  });

  const guestSeats = (booking.seats || []).filter(
    (s) => String(s.category || 'GUEST').toUpperCase() !== 'OWNER'
  );
  const ownerSeats = (booking.seats || []).filter(
    (s) => String(s.category || '').toUpperCase() === 'OWNER'
  );

  return (
    <div>
      <PageHeader
        title={booking.bookingNumber}
        subtitle="Booking details and ticket"
        actions={
          <>
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => setShowTicket(true)}
            >
              Print / Share
            </Button>
            {booking.bookingStatus === 'CONFIRMED' && (
              <Button
                className="flex-1 sm:flex-none"
                onClick={() => setShowTicket(true)}
              >
                Send email
              </Button>
            )}
            {booking.bookingStatus === 'CONFIRMED' && !editing && (
              <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </>
        }
      />

      <div className="grid min-w-0 gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0 space-y-4 overflow-visible rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-bold">
              {typeof movie === 'object' ? movie.title : 'Movie'}
            </h2>
            <Badge tone={booking.bookingStatus}>{booking.bookingStatus}</Badge>
          </div>
          <p className="text-sm text-muted">
            {formatDate(show?.showDate)} · {formatTime(show?.startTime)}
          </p>

          {!editing ? (
            <div className="space-y-2 text-sm">
              <Row label="Customer" value={booking.customerName} />
              <Row label="Mobile" value={booking.mobileNumber} />
              <Row label="Email" value={booking.customerEmail || '—'} />
              <Row
                label="Seats"
                value={(booking.seats || []).map(seatLabel).join(', ')}
              />
              <Row
                label="Guest"
                value={`${guestSeats.length} × ${formatCurrency(
                  booking.guestPrice ?? prices.guestPrice
                )}`}
              />
              <Row
                label="Owner"
                value={`${ownerSeats.length} × ${formatCurrency(
                  booking.ownerPrice ?? prices.ownerPrice
                )}`}
              />
              <Row label="Total" value={formatCurrency(booking.totalAmount)} />
              <Row
                label="Entry"
                value={
                  booking.checkInStatus === 'CHECKED_IN'
                    ? `Allotted${
                        booking.checkedInAt
                          ? ` · ${new Date(booking.checkedInAt).toLocaleString('en-IN')}`
                          : ''
                      }`
                    : 'Not scanned yet'
                }
              />
              {booking.scanToken && (
                <Row label="Scan code" value={booking.scanToken} />
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <Input
                  label="Mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
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
              <Select
                label="Assign seats as"
                value={seatCategory}
                onChange={(e) => setSeatCategory(e.target.value)}
              >
                <option value="GUEST">Guest — {formatCurrency(prices.guestPrice)}</option>
                <option value="OWNER">Owner — {formatCurrency(prices.ownerPrice)}</option>
              </Select>
              {seatsQuery.isLoading ? (
                <Skeleton className="h-48" />
              ) : (
                <SeatMap
                  seats={editableSeats}
                  selected={selectedSeats}
                  activeCategory={seatCategory}
                  onToggle={toggleSeat}
                  mode="book"
                />
              )}
              <p className="text-sm">
                Live total: <strong>{formatCurrency(liveTotal)}</strong>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel edit
                </Button>
                <Button
                  loading={updateMutation.isPending}
                  onClick={() => {
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
                      toast.error('Valid customer email is required');
                      return;
                    }
                    updateMutation.mutate({
                      customerName,
                      mobileNumber,
                      customerEmail,
                      seats: selectedSeats,
                    });
                  }}
                >
                  Save changes
                </Button>
              </div>
            </div>
          )}

          {!editing && (
            <div className="pt-2">
              <h3 className="mb-2 font-display text-lg font-bold">Show seats</h3>
              <p className="mb-3 text-xs text-muted">
                All seats for this show — your booking is highlighted.
              </p>
              {seatsQuery.isLoading ? (
                <Skeleton className="h-48" />
              ) : (
                <SeatMap
                  seats={seatsQuery.data?.data?.seats || []}
                  readonly
                  selected={[]}
                  highlightSeats={mySeatNumbers}
                  mode="view"
                />
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-5">
          <h3 className="font-display text-lg font-bold">Actions</h3>
          <Button className="w-full" onClick={() => setShowTicket(true)}>
            Send email / PDF
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setShowTicket(true)}>
            Download / Share PDF
          </Button>
          <Link to="/verify">
            <Button variant="outline" className="w-full">
              Open scanner
            </Button>
          </Link>
          <Link to={`/shows/${showId}`}>
            <Button variant="outline" className="w-full">
              Open show
            </Button>
          </Link>
          {booking.bookingStatus === 'CONFIRMED' && (
            <Button variant="ghost" className="w-full" onClick={() => setCancelOpen(true)}>
              Cancel Booking
            </Button>
          )}
          <Button variant="danger" className="w-full" onClick={() => setDeleteOpen(true)}>
            Delete Permanently
          </Button>
        </div>
      </div>

      {showTicket && <TicketView booking={booking} onClose={() => setShowTicket(false)} />}

      <ConfirmDialog
        open={cancelOpen}
        title="Cancel Booking"
        confirmLabel="Cancel Booking"
        danger
        loading={cancelMutation.isPending}
        message="Booking status will become CANCELLED and seats will be released."
        onClose={() => setCancelOpen(false)}
        onConfirm={() => cancelMutation.mutate()}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete Permanently"
        confirmLabel="Delete Permanently"
        danger
        loading={deleteMutation.isPending}
        message="This permanently removes the booking record."
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4 border-b border-dashed border-line py-2">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="break-words text-right font-semibold">{value}</span>
    </div>
  );
}
